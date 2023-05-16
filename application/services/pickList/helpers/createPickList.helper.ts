import { CreatePickListsRepositoryInput } from '@custom-types/PickList';
import { ForbiddenError, logger, ResourceNotFoundError, ValidationError } from '@procurenetworks/backend-utils';
import {
  OrderRequestEntity,
  OrderRequestItemEntity,
  PickListEntity,
  ShippingTransactionEntity,
  StringObjectID,
  TransactionEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { omit } from 'lodash';
import { ItemService, ShippingTransactionService, TransactionService } from '../../../transport/__grpc/client/services';
import { expandOrderEntities } from '../../../utils/expandOrderEntities';
import { getSiteIdOfPartnerTenant } from '../../orderRequest/helpers/externalOrderRequest.helper';
import { OrderRequestItemServiceV2 } from '../../orderRequestItem/orderRequestItem.service';
import { validateCreatePickList } from './pickList.validators';

export const parseCreatePickListInput = (
  createPickListInput: PickListEntity.CreatePickListInput,
  orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): {
  orderRequestItemsToCreate: OrderRequestItemEntity.CreateOrderRequestItemInput[];
  orderRequestItemsToUpdate: OrderRequestItemEntity.OrderRequestItemSchema[];
  pickListToCreate: CreatePickListsRepositoryInput;
} => {
  const {
    currentUserInfo: { _id: currentUserId },
  } = userContext;
  const { items: pickListItems, orderRequestId, siteId } = createPickListInput;
  const orderRequestItemsToCreate: OrderRequestItemEntity.CreateOrderRequestItemInput[] = [];
  const orderRequestItemsToUpdate: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
  const pickListToCreate: CreatePickListsRepositoryInput = {
    permissions: [],
    createdById: currentUserId,
    orderRequestId,
    pickListItems: [],
    siteId,
    tenantId: userContext.tenantId,
  };
  const quantitiesOfOrderRequestItemsPickedById = pickListItems.reduce(
    (result: Record<string, number>, pickListItem: PickListEntity.CreatePickListItemInput) => {
      const totalQuantityFromCurrentLocation = pickListItem.containers.reduce(
        (totalQuantity, { quantity }) => totalQuantity + quantity,
        0,
      );
      if (result[pickListItem._id.toString()]) {
        // eslint-disable-next-line no-param-reassign
        result[pickListItem._id.toString()] += totalQuantityFromCurrentLocation;
      } else {
        // eslint-disable-next-line no-param-reassign
        result[pickListItem._id.toString()] = totalQuantityFromCurrentLocation;
      }
      return result;
    },
    {},
  );
  const pickedItemIds = Object.keys(quantitiesOfOrderRequestItemsPickedById);
  for (const pickedItemId of pickedItemIds) {
    const { [pickedItemId]: quantityPicked } = quantitiesOfOrderRequestItemsPickedById;
    const orderRequestItem = orderRequestItems.find(({ _id }) => _id.toString() === pickedItemId);
    const pickedItem = pickListItems.find(
      ({ _id }) => _id.toString() === pickedItemId,
    ) as PickListEntity.CreatePickListItemInput;
    if (!orderRequestItem) {
      /* Ideally the error would have thrown out earlier in validateCreatePickList call. */
      throw new ValidationError({
        debugMessage: 'Non pick-able order request item requested to be picked.',
        message: `OrderRequestItem with id ${pickedItemId} is not available to be picked.`,
        params: {
          createPickListInput,
          orderRequestItems,
          orderRequestItem,
          pickedItemId,
        },
        where: 'createPickListHelper - parseCreatePickListInput',
      });
    }
    if (quantityPicked === 0) {
      /* Any orderRequestItem that has not been picked at all will be moved to back-ordered. */
      orderRequestItemsToUpdate.push({
        ...orderRequestItem,
        status: OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
        statusHistory: orderRequestItem.statusHistory.concat({
          createdAt: userContext.requestTimestamp,
          createdById: currentUserId,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
        }),
      });
    } else if (orderRequestItem.quantity > quantityPicked) {
      /* Reduced the quantity of existing item and creating a new item for same SKU with the quantity remaining. The status of new orderRequestItem will be back-ordered. */
      orderRequestItemsToUpdate.push({
        ...orderRequestItem,
        quantity: quantityPicked,
        status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        statusHistory: orderRequestItem.statusHistory.concat({
          createdAt: userContext.requestTimestamp,
          createdById: currentUserId,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        }),
      });
      /** Status history will be updated by createOrderRequestItems method of OrderRequestItemService. */
      orderRequestItemsToCreate.push({
        ...omit(
          {
            ...orderRequestItem,
            createdById: currentUserId,
            quantity: orderRequestItem.quantity - quantityPicked,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
            updatedById: currentUserId,
          },
          ['_id', '__v', 'createdAt', 'updatedAt'],
        ),
      });
    } else {
      orderRequestItemsToUpdate.push({
        ...orderRequestItem,
        status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        statusHistory: orderRequestItem.statusHistory.concat({
          createdAt: userContext.requestTimestamp,
          createdById: currentUserId,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        }),
      });
    }

    pickListToCreate.pickListItems.push({
      cost: parseFloat(pickedItem.cost),
      locationId: pickedItem.locationId,
      orderRequestItemId: pickedItemId,
      quantityPicked,
    });
  }
  return { orderRequestItemsToCreate, orderRequestItemsToUpdate, pickListToCreate };
};

export const parseCreatePickListInputForChildTenant = async (
  createPickListInputOfParentTenant: PickListEntity.CreatePickListInput,
  orderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema,
  orderRequestItemsCreatedInParentTenant: OrderRequestItemEntity.OrderRequestItemSchema[],
  childUserContext: UserContext,
  parentUserContext: UserContext,
): Promise<{
  orderRequestItemsToCreateInChildTenant: OrderRequestItemEntity.CreateOrderRequestItemInput[];
  orderRequestItemsToUpdateInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema[];
  pickListToCreateInChildTenant: CreatePickListsRepositoryInput;
}> => {
  const { orderRequestId, items: itemsPickedInParentTenant } = createPickListInputOfParentTenant;

  if (!orderRequestInChildTenant) {
    throw new ForbiddenError({
      debugMessage: `Order request with id: ${orderRequestId} is not accessible to the user.`,
      message: `The order request you are trying to pick and pack is not accessible to you. Please refresh and try again`,
      where: `${__filename} - ${parseCreatePickListInputForChildTenant.name}`,
    });
  }

  const [pickableOrderRequestItemsInChildTenant, siteIdInChildTenant] = await Promise.all([
    OrderRequestItemServiceV2.getPickableOrderRequestItemsOfOrderRequest(orderRequestInChildTenant._id, childUserContext),
    getSiteIdOfPartnerTenant(parentUserContext.tenantId, childUserContext),
  ]);

  const createPickListInputOfChildTenant: PickListEntity.CreatePickListInput = {
    ...createPickListInputOfParentTenant,
    orderRequestId: orderRequestInChildTenant._id,
    siteId: siteIdInChildTenant,
    items: itemsPickedInParentTenant.map((itemPickedInParentTenant) => {
      const correspondingOrderRequestItemInChildTenant = pickableOrderRequestItemsInChildTenant.find(
        (orderRequestItem) =>
          orderRequestItem.entityIdInSourceTenant?.toString() === itemPickedInParentTenant._id.toString(),
      );
      if (!correspondingOrderRequestItemInChildTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `Item corresponding to the ${itemPickedInParentTenant._id} was not found in child tenant. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${parseCreatePickListInputForChildTenant.name}`,
          params: {
            createPickListInputOfChildTenant,
            siteIdInChildTenant,
            orderRequestInChildTenant,
            pickableOrderRequestItemsInChildTenant,
          },
        });
      }
      return {
        ...itemPickedInParentTenant,
        _id: correspondingOrderRequestItemInChildTenant._id,
        locationId: siteIdInChildTenant,
        sku: correspondingOrderRequestItemInChildTenant.sku as string,
      };
    }),
  };

  await validateCreatePickList(
    orderRequestInChildTenant,
    pickableOrderRequestItemsInChildTenant,
    createPickListInputOfChildTenant,
    childUserContext,
  );

  const {
    orderRequestItemsToCreate: orderRequestItemsToCreateInChildTenant,
    orderRequestItemsToUpdate: orderRequestItemsToUpdateInChildTenant,
    pickListToCreate: pickListToCreateInChildTenant,
  } = parseCreatePickListInput(createPickListInputOfChildTenant, pickableOrderRequestItemsInChildTenant, childUserContext);

  const { items: itemsInChildTenant } = await ItemService.getAllItems(
    {
      filters: {
        itemIds: orderRequestItemsToCreateInChildTenant.map((orderRequestItem) => orderRequestItem.itemId as StringObjectID),
      },
    },
    childUserContext,
  );

  /** Setting entityIdInSourceTenant field in order request items that will be created in child from parent. */
  orderRequestItemsToCreateInChildTenant.forEach((orderRequestItemToCreateInChildTenant) => {
    const correspondingItemInChildTenant = itemsInChildTenant.find(
      (item) => item._id.toString() === orderRequestItemToCreateInChildTenant.itemId?.toString(),
    );
    if (!correspondingItemInChildTenant) {
      throw new ResourceNotFoundError({
        debugMessage: `Item corresponding to the ${orderRequestItemToCreateInChildTenant.itemId} was not found in child tenant. Possibility of data corruption while data duplication or someone might have deleted the item.`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        where: `${__filename} - ${parseCreatePickListInputForChildTenant.name}`,
        params: {
          createPickListInputOfChildTenant,
          orderRequestInChildTenant,
          pickableOrderRequestItemsInChildTenant,
        },
      });
    }
    const correspondingOrderRequestItemInParentTenant = orderRequestItemsCreatedInParentTenant.find(
      (orderRequestItem) =>
        correspondingItemInChildTenant.entityIdInSourceTenant?.toString() === orderRequestItem.itemId?.toString(),
    );
    // eslint-disable-next-line no-param-reassign
    orderRequestItemToCreateInChildTenant.entityIdInSourceTenant = correspondingOrderRequestItemInParentTenant?._id;
  });

  return {
    orderRequestItemsToCreateInChildTenant,
    orderRequestItemsToUpdateInChildTenant,
    pickListToCreateInChildTenant,
  };
};

export const packPickedOrderRequestItemsIntoContainers = async (
  createPickListInput: PickListEntity.CreatePickListInput,
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): Promise<Record<string, OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]>> => {
  try {
    const [expandedOrderRequest] = await expandOrderEntities([{ orderRequest }], userContext);
    const containerItemsByContainerId = createPickListInput.items.reduce(
      (result: Record<string, ShippingTransactionEntity.ShippingTransactionOrderRequestItemSchema[]>, item) => {
        const pickedItem = orderRequestItems.find(
          (orderRequestItem) => orderRequestItem._id.toString() === item._id.toString(),
        );
        if (!pickedItem) {
          return result;
        }

        item.containers.forEach(({ containerId, quantity }) => {
          if (!result[containerId]) {
            // eslint-disable-next-line no-param-reassign
            result[containerId] = [];
          }
          result[containerId].push({
            itemSource: ShippingTransactionEntity.ShippingTransactionItemSourceEnum.ORDER_REQUEST,
            locationId: item.locationId,
            orderRequestItemId: pickedItem._id,
            projectId: pickedItem.projectId,
            quantity,
            sku: pickedItem.sku as string,
            itemId: pickedItem.itemId as StringObjectID,
          });
        });
        return result;
      },
      {},
    );
    /* Creating a createShippingTransactionsInput. */
    const createShippingTransactionsInput = {
      containers: Object.keys(containerItemsByContainerId).map((containerId) => ({
        containerId,
        items: containerItemsByContainerId[containerId],
      })),
      orderRequest: expandedOrderRequest,
      sourceSiteId: createPickListInput.siteId,
    };

    /* Packing returned orderRequestItems into containers */
    const { shippingTransactions: createdShippingTransactions } =
      await ShippingTransactionService.createShippingTransactionsBasedOnOrderRequest(
        { inputs: [createShippingTransactionsInput] },
        userContext,
      );

    const trackingDetailsByOrderRequestItemId: Record<
      string,
      OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]
    > = {};
    for (const shippingTransaction of createdShippingTransactions) {
      for (const item of shippingTransaction.items) {
        const orderRequestItem = item as ShippingTransactionEntity.ShippingTransactionOrderRequestItemSchema;
        if (!trackingDetailsByOrderRequestItemId[orderRequestItem.orderRequestItemId.toString()]) {
          trackingDetailsByOrderRequestItemId[orderRequestItem.orderRequestItemId.toString()] = [];
        }
        trackingDetailsByOrderRequestItemId[orderRequestItem.orderRequestItemId.toString()].push({
          locationId: item.locationId,
          quantity: item.quantity,
          status: shippingTransaction.status,
          trackingId: shippingTransaction.trackingId,
        });
      }
    }
    return trackingDetailsByOrderRequestItemId;
  } catch (error: any) {
    logger.error({ error, message: 'Error in creating shippingTransactions' });
    throw error;
  }
};

export const createExternalOrderMoveTransactionForPickList = async (
  pickListToCreateInChildTenant: CreatePickListsRepositoryInput,
  orderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema,
  orderRequestItemsToUpdateInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema[],
  trackingDetailsByOrderRequestItemIdInParentTenant: Record<
    string,
    OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]
  >,
  childUserContext: UserContext,
) => {
  const transactionEntities: TransactionEntity.CreateMoveTransactionsInput['entities'] = [];

  const orderRequestItemIdsPackedInParentTenant = Object.keys(trackingDetailsByOrderRequestItemIdInParentTenant);
  for (let index = 0; index < orderRequestItemIdsPackedInParentTenant.length; index++) {
    const { [index]: orderRequestItemIdInParentTenant } = orderRequestItemIdsPackedInParentTenant;
    const { [orderRequestItemIdInParentTenant]: trackingDetailsOfOrderRequestItemIdInParentTenant } =
      trackingDetailsByOrderRequestItemIdInParentTenant;
    trackingDetailsOfOrderRequestItemIdInParentTenant.forEach((trackingDetail) => {
      const correspondingOrderRequestItemInChildTenant = orderRequestItemsToUpdateInChildTenant.find(
        (orderRequestItem) =>
          orderRequestItem.entityIdInSourceTenant?.toString() === orderRequestItemIdInParentTenant.toString(),
      );
      transactionEntities.push({
        entityId: correspondingOrderRequestItemInChildTenant?.itemId as StringObjectID,
        entityType:
          (correspondingOrderRequestItemInChildTenant?.sku as string).slice(0, 3) === 'INV'
            ? TransactionEntity.TransactionEntityTypeEnum.INVENTORY
            : TransactionEntity.TransactionEntityTypeEnum.ASSET,
        sourceSiteId: pickListToCreateInChildTenant.siteId,
        sourceLocationId: pickListToCreateInChildTenant.siteId,
        destinationSiteId: orderRequestInChildTenant.destinationSiteId,
        destinationLocationId: orderRequestInChildTenant.destinationSiteId,
        quantity: trackingDetail.quantity,
        billToSiteId: orderRequestInChildTenant.billToSiteId,
        departmentId: orderRequestInChildTenant.departmentId,
        meta: {
          orderRequestItemId: correspondingOrderRequestItemInChildTenant?._id,
          orderRequestId: orderRequestInChildTenant._id,
          trackingIdInPartnerTenant: trackingDetail.trackingId,
        },
        projectId: correspondingOrderRequestItemInChildTenant?.projectId,
      });
    });
  }

  const createExternalOrderMoveTransactionForPickListInput: TransactionEntity.CreateMoveTransactionsInput = {
    type: TransactionEntity.TransactionTypeEnum.MOVE,
    subType: TransactionEntity.TransactionSubTypeEnum.EXTERNAL_ORDER_IN,
    status: TransactionEntity.TransactionStatusEnum.IN_TRANSIT,
    entities: transactionEntities,
  };

  const { transactions: createdMoveTransactions } = await TransactionService.createMoveTransactions(
    createExternalOrderMoveTransactionForPickListInput,
    childUserContext,
  );

  if (!createdMoveTransactions) {
    throw new ForbiddenError({
      debugMessage: `User could not create move transaction in child tenant.`,
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      where: `${__filename} - ${createExternalOrderMoveTransactionForPickList.name}`,
    });
  }

  const transactionDetailsByOrderRequestItemId: Record<
    string,
    OrderRequestItemEntity.OrderRequestItemTransactionDetailsSchema[]
  > = {};
  for (const moveTransaction of createdMoveTransactions) {
    if (moveTransaction.meta && moveTransaction.meta.orderRequestItemId && moveTransaction.meta.trackingIdInPartnerTenant) {
      if (!transactionDetailsByOrderRequestItemId[moveTransaction.meta.orderRequestItemId.toString()]) {
        transactionDetailsByOrderRequestItemId[moveTransaction.meta.orderRequestItemId.toString()] = [];
      }
      transactionDetailsByOrderRequestItemId[moveTransaction.meta.orderRequestItemId.toString()].push({
        quantity: moveTransaction.quantity,
        status: moveTransaction.status,
        trackingIdInPartnerTenant: moveTransaction.meta.trackingIdInPartnerTenant,
        transactionId: moveTransaction._id,
      });
    }
  }
  return transactionDetailsByOrderRequestItemId;
};
