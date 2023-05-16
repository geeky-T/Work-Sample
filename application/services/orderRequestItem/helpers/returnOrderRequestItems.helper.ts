import {
  CreateOrderRequestItemRepositoryInput,
  UpdateOrderRequestItemRepositoryInput,
} from '@custom-types/OrderRequestItem';
import { ForbiddenError, logger, ResourceNotFoundError, ValidationError } from '@procurenetworks/backend-utils';
import {
  OrderRequestEntity,
  OrderRequestItemEntity,
  ShippingContainerEntity,
  ShippingTransactionEntity,
  StringObjectID,
  TransactionEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { PickListServiceV2 } from '@services/pickList/pickList.service';
import { ShippingContainerService, ShippingTransactionService, TransactionService } from '@transport/__grpc/client/services';
import { keyBy } from 'lodash';
import omit from 'lodash/omit';
import uniqBy from 'lodash/uniqBy';
import mongoose from 'mongoose';
import { expandOrderEntities } from '../../../utils/expandOrderEntities';
import { contextUserUtil } from '../../../utils/userAuthentication/contextUser.util';

export const parseReturnedOrderRequestItems = (
  returnedOrderRequestItems: OrderRequestItemEntity.ReturnedOrderRequestItemDetails[],
  eligibleOrderRequestItemsForReturn: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): {
  orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[];
  orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[];
} => {
  const orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[] = [];
  const orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[] = [];
  returnedOrderRequestItems.forEach((returnedItem) => {
    const correspondingOrderRequestItem = eligibleOrderRequestItemsForReturn.find(
      (orderRequestItem) => orderRequestItem._id.toString() === returnedItem._id,
    );
    if (!correspondingOrderRequestItem) {
      /* Ideally this would never happen because if the item is not in the array then error was supposed to be thrown in validateReturnOrderRequestItemsInput. */
      throw new ValidationError({
        debugMessage: 'Ineligible item requested to return.',
        message: `OrderRequestItem with ${returnedItem._id} is not eligible for return.`,
        params: { returnedOrderRequestItems, eligibleOrderRequestItemsForReturn, returnedItem },
        where: 'returnedRequestItemHelper - parseReturnedOrderRequestItems',
      });
    }
    if (correspondingOrderRequestItem.quantity < returnedItem.quantity) {
      throw new ValidationError({
        debugMessage: 'Quantity returned > Quantity delivered.',
        message: `The quantity entered is greater than the quantity delivered for this Item {${correspondingOrderRequestItem.sku}}. Please recheck and provide a valid quantity.`,
        params: {
          returnedOrderRequestItems,
          eligibleOrderRequestItemsForReturn,
          correspondingOrderRequestItem,
          returnedItem,
        },
        where: 'returnedRequestItemHelper - parseReturnedOrderRequestItems',
      });
    }
    if (correspondingOrderRequestItem.quantity > returnedItem.quantity) {
      /* A case where quantity returned is less than the quantity request for the orderRequestItem. */
      orderRequestItemsToUpdate.push({
        _id: correspondingOrderRequestItem._id,
        quantity: correspondingOrderRequestItem.quantity - returnedItem.quantity,
        updatedAt: userContext.requestTimestamp,
        updatedById: userContext.currentUserInfo._id,
      });
      orderRequestItemsToCreate.push({
        _id: new mongoose.Types.ObjectId(),
        ...omit(
          {
            ...correspondingOrderRequestItem,
            createdAt: userContext.requestTimestamp,
            createdById: userContext.currentUserInfo._id,
            parentOrderRequestItemId: correspondingOrderRequestItem._id,
            quantity: returnedItem.quantity,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
            statusHistory: correspondingOrderRequestItem.statusHistory.concat([
              {
                createdAt: userContext.requestTimestamp,
                createdById: userContext.currentUserInfo._id,
                reason: `Returned by ${userContext.currentUserInfo.email}`,
                status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
              },
            ]),
            trackingDetails: [],
            trackingHistory: uniqBy(
              (correspondingOrderRequestItem.trackingHistory || []).concat(
                correspondingOrderRequestItem.trackingDetails || [],
              ),
              (element) => element.trackingId,
            ),
            updatedAt: userContext.requestTimestamp,
            updatedById: userContext.currentUserInfo._id,
          },
          ['_id', '__v', 'createdAt', 'updatedAt'],
        ),
        originalOrderRequestItemId: correspondingOrderRequestItem._id,
      });
    } else {
      /* A case where quantity returned == quantity of the item */
      orderRequestItemsToUpdate.push({
        _id: correspondingOrderRequestItem._id,
        parentOrderRequestItemId: correspondingOrderRequestItem._id,
        status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        statusHistory: correspondingOrderRequestItem.statusHistory.concat([
          {
            createdAt: userContext.requestTimestamp,
            createdById: userContext.currentUserInfo._id,
            reason: `Returned by ${userContext.currentUserInfo.email}`,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
          },
        ]),
        trackingDetails: [],
        transactionDetails: [],
        trackingHistory: uniqBy(
          (correspondingOrderRequestItem.trackingHistory || []).concat(correspondingOrderRequestItem.trackingDetails || []),
          (element) => element.trackingId,
        ),
        transactionHistory: uniqBy(
          (correspondingOrderRequestItem.transactionHistory || []).concat(
            correspondingOrderRequestItem.transactionDetails || [],
          ),
          (element) => element.trackingIdInPartnerTenant,
        ),
        updatedAt: userContext.requestTimestamp,
        updatedById: userContext.currentUserInfo._id,
      });
    }
  });
  return {
    orderRequestItemsToCreate,
    orderRequestItemsToUpdate,
  };
};

export const parseReturnedOrderRequestItemsForParentTenant = (
  eligibleOrderRequestItemsForReturnInParentTenant: OrderRequestItemEntity.OrderRequestItemSchema[],
  eligibleOrderRequestItemsForReturnInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema[],
  orderRequestItemsToCreateInChildTenant: CreateOrderRequestItemRepositoryInput[],
  orderRequestItemsToUpdateInChildTenant: UpdateOrderRequestItemRepositoryInput[],
): {
  orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[];
  orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[];
} => {
  const orderRequestItemsToCreateInParentTenant: CreateOrderRequestItemRepositoryInput[] = [];
  const orderRequestItemsToUpdateInParentTenant: UpdateOrderRequestItemRepositoryInput[] = [];

  for (const orderRequestItemToUpdateInChildTenant of orderRequestItemsToUpdateInChildTenant) {
    const orderRequestItemInChildTenant = eligibleOrderRequestItemsForReturnInChildTenant.find(
      ({ _id }) => _id.toString() === orderRequestItemToUpdateInChildTenant._id.toString(),
    );
    const orderRequestItemIdInParentTenant = orderRequestItemInChildTenant?.entityIdInSourceTenant;
    if (!orderRequestItemIdInParentTenant) {
      throw new ResourceNotFoundError({
        debugMessage: `OrderRequestItem does not have entityIdInSourceTenant. Possibility of data corruption.`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
        params: { orderRequestItemToUpdateInChildTenant },
      });
    }
    const correspondingOrderRequestItemInParentTenant = eligibleOrderRequestItemsForReturnInParentTenant.find(
      ({ _id }) => orderRequestItemIdInParentTenant.toString() === _id.toString(),
    );

    if (!correspondingOrderRequestItemInParentTenant) {
      throw new ResourceNotFoundError({
        debugMessage: `Item corresponding to the ${orderRequestItemIdInParentTenant} was not found in parent tenant. Possibility of data corruption.`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
        params: {
          eligibleOrderRequestItemsForReturnInParentTenant,
          orderRequestItemIdInParentTenant,
        },
      });
    }

    const fieldsUpdatedInParentTenant = Object.keys(orderRequestItemToUpdateInChildTenant);

    const orderRequestItemToUpdateInParentTenant: UpdateOrderRequestItemRepositoryInput = {
      _id: correspondingOrderRequestItemInParentTenant._id,
    };

    for (const field of fieldsUpdatedInParentTenant) {
      switch (field) {
        case '_id':
          orderRequestItemToUpdateInParentTenant._id = correspondingOrderRequestItemInParentTenant._id;
          break;
        case 'quantity':
          orderRequestItemToUpdateInParentTenant.quantity =
            orderRequestItemToUpdateInChildTenant.quantity || correspondingOrderRequestItemInParentTenant.quantity;
          break;
        case 'status':
          orderRequestItemToUpdateInParentTenant.status =
            orderRequestItemToUpdateInChildTenant.status || correspondingOrderRequestItemInParentTenant.status;
          break;
        case 'statusHistory':
          orderRequestItemToUpdateInParentTenant.statusHistory =
            orderRequestItemToUpdateInChildTenant.statusHistory || correspondingOrderRequestItemInParentTenant.statusHistory;
          break;
        case 'updatedAt':
          orderRequestItemToUpdateInParentTenant.updatedAt =
            orderRequestItemToUpdateInChildTenant.updatedAt || correspondingOrderRequestItemInParentTenant.updatedAt;
          break;
        case 'updatedById':
          orderRequestItemToUpdateInParentTenant.updatedById =
            orderRequestItemToUpdateInChildTenant.updatedById || correspondingOrderRequestItemInParentTenant.updatedById;
          break;
        case 'nonRemovableNotes':
          orderRequestItemToUpdateInParentTenant.nonRemovableNotes =
            orderRequestItemToUpdateInChildTenant.nonRemovableNotes ||
            correspondingOrderRequestItemInParentTenant.nonRemovableNotes;
          break;
        case 'note':
          orderRequestItemToUpdateInParentTenant.note =
            orderRequestItemToUpdateInChildTenant.note || correspondingOrderRequestItemInParentTenant.note;
          break;
        case 'deletedAt':
          orderRequestItemToUpdateInParentTenant.deletedAt =
            orderRequestItemToUpdateInChildTenant.deletedAt || correspondingOrderRequestItemInParentTenant.deletedAt;
          break;
        case 'deletedById':
          orderRequestItemToUpdateInParentTenant.deletedById =
            orderRequestItemToUpdateInChildTenant.deletedById || correspondingOrderRequestItemInParentTenant.deletedById;
          break;
        case 'parentOrderRequestItemId':
          orderRequestItemToUpdateInParentTenant.parentOrderRequestItemId =
            orderRequestItemToUpdateInChildTenant.parentOrderRequestItemId ||
            correspondingOrderRequestItemInParentTenant.parentOrderRequestItemId;
          break;
        case 'trackingDetails':
          orderRequestItemToUpdateInParentTenant.trackingDetails = [];
          break;
        case 'trackingHistory':
          orderRequestItemToUpdateInParentTenant.trackingHistory = uniqBy(
            correspondingOrderRequestItemInParentTenant.trackingHistory.concat(
              correspondingOrderRequestItemInParentTenant.trackingDetails || [],
            ),
            (element) => element.trackingId,
          );
          break;
        case 'transactionDetails':
          orderRequestItemToUpdateInParentTenant.transactionDetails = [];
          break;
        case 'transactionHistory':
          orderRequestItemToUpdateInParentTenant.transactionHistory = uniqBy(
            correspondingOrderRequestItemInParentTenant.transactionHistory.concat(
              correspondingOrderRequestItemInParentTenant.transactionDetails || [],
            ),
            (element) => element.trackingIdInPartnerTenant,
          );
          break;
        default:
          break;
      }
    }
    orderRequestItemsToUpdateInParentTenant.push(orderRequestItemToUpdateInParentTenant);
  }

  for (const orderRequestItemToCreateInChildTenant of orderRequestItemsToCreateInChildTenant) {
    const { _id: orderRequestItemIdInParentTenant, originalOrderRequestItemId } = orderRequestItemToCreateInChildTenant;
    const correspondingOrderRequestItemInParentTenant = eligibleOrderRequestItemsForReturnInParentTenant.find(
      ({ _id }) => _id.toString() === originalOrderRequestItemId?.toString(),
    );
    if (!correspondingOrderRequestItemInParentTenant) {
      throw new ResourceNotFoundError({
        debugMessage: `OrderRequestItem corresponding to the ${originalOrderRequestItemId} was not found in child tenant. Possibility of data corruption.`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
        params: { orderRequestItemToCreateInChildTenant, originalOrderRequestItemId },
      });
    }

    orderRequestItemsToCreateInParentTenant.push({
      ...correspondingOrderRequestItemInParentTenant,
      ...orderRequestItemToCreateInChildTenant,
      itemId: correspondingOrderRequestItemInParentTenant._id,
      projectId: correspondingOrderRequestItemInParentTenant.projectId,
      categoryId: correspondingOrderRequestItemInParentTenant.categoryId,
      entityIdInSourceTenant: orderRequestItemIdInParentTenant,
      orderRequestId: correspondingOrderRequestItemInParentTenant.orderRequestId,
      parentOrderRequestItemId: correspondingOrderRequestItemInParentTenant.parentOrderRequestItemId,
      tenantId: correspondingOrderRequestItemInParentTenant.tenantId,
      trackingDetails: [],
      trackingHistory: uniqBy(
        correspondingOrderRequestItemInParentTenant.trackingDetails,
        (trackingDetail) => trackingDetail.trackingId,
      ),
      transactionDetails: [],
      transactionHistory: uniqBy(
        correspondingOrderRequestItemInParentTenant.transactionDetails,
        (transactionDetail) => transactionDetail.trackingIdInPartnerTenant,
      ),
    });
  }

  return {
    orderRequestItemsToCreate: orderRequestItemsToCreateInParentTenant,
    orderRequestItemsToUpdate: orderRequestItemsToUpdateInParentTenant,
  };
};

export const packReturnedOrderRequestItemsIntoAContainer = async (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  returnedOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): Promise<Record<string, OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]>> => {
  const [expandedOrderRequest] = await expandOrderEntities([{ orderRequest }], userContext);
  const returnedOrderRequestItemIds = returnedOrderRequestItems.map(({ parentOrderRequestItemId }) =>
    parentOrderRequestItemId?.toString(),
  ) as string[];

  /* Fetching pickLists to get origin sites for returned items. */
  const { pickLists } = await PickListServiceV2.getAllPickLists(
    {
      filters: {
        orderRequestItemIds: returnedOrderRequestItemIds,
      },
    },
    userContext,
  );

  /* Extracting out returned orderRequestItem's picked siteIds */
  const returnedOrderRequestItemIdsByOriginSiteId = pickLists.reduce((result: Map<string, StringObjectID[]>, pickList) => {
    pickList.pickListItems.forEach((item) => {
      if (returnedOrderRequestItemIds.includes(item.orderRequestItemId.toString())) {
        result.set(
          pickList.siteId.toString(),
          (result.get(pickList.siteId.toString()) || []).concat([item.orderRequestItemId]),
        );
      }
    });
    return result;
  }, new Map<string, StringObjectID[]>());

  const originSiteIds = [...returnedOrderRequestItemIdsByOriginSiteId.keys()];

  /* Creating a container for each destination site for packing items in respective container. */
  const createdShippingContainers = await Promise.all(
    originSiteIds.map(async (originSiteId) => {
      const { shippingContainers } = await ShippingContainerService.createShippingContainers(
        {
          containerType: ShippingContainerEntity.ShippingContainerTypePrefixEnum.PKG,
          count: 1,
          destinationSiteId: originSiteId,
          options: { willBeUsedForReturn: true },
        },
        userContext,
      );
      /* Only one container per destinationSiteId */
      return shippingContainers[0];
    }),
  );

  try {
    const createdShippingContainersByDestinationSiteId = keyBy(
      createdShippingContainers,
      (container) => container.destinationSiteId,
    );
    /* Creating a createShippingTransactionsInput. */
    const createShippingTransactionsInputs: ShippingTransactionEntity.CreateShippingTransactionsBasedOnOrderRequestInput[] =
      [];
    for (const siteId of originSiteIds) {
      let orderRequestItemIdsForSiteId = returnedOrderRequestItemIdsByOriginSiteId.get(siteId);
      if (orderRequestItemIdsForSiteId) {
        let createShippingTransactionsInput:
          | ShippingTransactionEntity.CreateShippingTransactionsBasedOnOrderRequestInput
          | undefined;
        orderRequestItemIdsForSiteId = uniqBy(orderRequestItemIdsForSiteId, (orderRequestItemId) =>
          orderRequestItemId.toString(),
        );
        for (const orderRequestItemId of orderRequestItemIdsForSiteId) {
          const orderRequestItem = returnedOrderRequestItems.find(
            (currentOrderRequestItem) =>
              currentOrderRequestItem.parentOrderRequestItemId?.toString() === orderRequestItemId.toString(),
          );
          if (!orderRequestItem) {
            throw new ValidationError({
              debugMessage: 'Unreturnable item requested to be packed and returned.',
              message: 'One of the item in the request cannot be returned.',
              params: { returnedOrderRequestItems, expandedOrderRequest },
              where: 'returnedRequestItemHelper - packReturnedOrderRequestItemsIntoAContainer',
            });
          }
          if (!orderRequestItem.sku || !orderRequestItem.itemId) {
            throw new ValidationError({
              debugMessage: 'No-SKU/non-stocked order request item(s) cannot be returned.',
              message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
              params: { returnedOrderRequestItems, expandedOrderRequest },
              where: 'returnedRequestItemHelper - packReturnedOrderRequestItemsIntoAContainer',
            });
          }
          const { [siteId]: shippingContainer } = createdShippingContainersByDestinationSiteId;
          if (!createShippingTransactionsInput) {
            createShippingTransactionsInput = {
              containers: [
                {
                  containerId: (shippingContainer as ShippingContainerEntity.ExpandedShippingContainerType).containerId,
                  items: [
                    {
                      itemSource: ShippingTransactionEntity.ShippingTransactionItemSourceEnum.ORDER_REQUEST,
                      locationId: orderRequest.destinationSiteId,
                      orderRequestItemId: orderRequestItem._id,
                      quantity: orderRequestItem.quantity,
                      projectId: orderRequestItem.projectId,
                      sku: orderRequestItem.sku,
                      itemId: orderRequestItem.itemId,
                    },
                  ],
                },
              ],
              orderRequest: expandedOrderRequest,
              sourceSiteId: orderRequest.destinationSiteId,
              destinationSiteId: siteId,
            };
          } else {
            createShippingTransactionsInput.containers[0].items.push({
              itemSource: ShippingTransactionEntity.ShippingTransactionItemSourceEnum.ORDER_REQUEST,
              locationId: orderRequest.destinationSiteId,
              orderRequestItemId: orderRequestItem._id,
              quantity: orderRequestItem.quantity,
              sku: orderRequestItem.sku,
              itemId: orderRequestItem.itemId,
            });
          }
        }
        if (createShippingTransactionsInput) {
          createShippingTransactionsInputs.push(createShippingTransactionsInput);
        }
      }
    }

    /* Packing returned orderRequestItems into containers */
    const { shippingTransactions: createdShippingTransactions } =
      await ShippingTransactionService.createShippingTransactionsBasedOnOrderRequest(
        { inputs: createShippingTransactionsInputs },
        userContext,
      );

    const trackingDetailsByOrderRequestItemId: Record<
      string,
      OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]
    > = {};
    for (const shippingTransaction of createdShippingTransactions) {
      for (const item of shippingTransaction.items) {
        const shippingTransactionOrderRequestItem =
          item as ShippingTransactionEntity.ShippingTransactionOrderRequestItemSchema;
        trackingDetailsByOrderRequestItemId[shippingTransactionOrderRequestItem.orderRequestItemId.toString()] = [
          {
            locationId: item.locationId,
            quantity: item.quantity,
            status: shippingTransaction.status,
            trackingId: shippingTransaction.trackingId,
          },
        ];
      }
    }
    return trackingDetailsByOrderRequestItemId;
  } catch (error: any) {
    logger.error({ error, message: 'Error in creating shippingTransactions for return' });
    /* Deleting container if things got failed. */
    await ShippingContainerService.deleteShippingContainers(
      {
        containerIds: createdShippingContainers.map((container) => container.containerId),
      },
      userContext,
    );
    throw error;
  }
};

export const createExternalOrderMoveTransactionForReturn = async (
  orderRequestInParentTenant: OrderRequestEntity.OrderRequestSchema,
  orderRequestItemsReturnedInPackedStatusInParentTenant: UpdateOrderRequestItemRepositoryInput[],
  orderRequestItemsReturnedInPackedStatusInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema[],
  trackingDetailsByOrderRequestItemIdInChildTenant: Record<
    string,
    OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]
  >,
  childUserContext: UserContext,
) => {
  const orderRequestItemIdsReturnedInChildTenant = Object.keys(trackingDetailsByOrderRequestItemIdInChildTenant);
  const orderRequestItemIdsReturnedInParentTenant = orderRequestItemsReturnedInPackedStatusInParentTenant.map(({ _id }) =>
    _id.toString(),
  );
  const parentUserContext = contextUserUtil.switchTenantForInternalUsage(
    childUserContext,
    orderRequestInParentTenant.tenantId,
  );
  /* Fetching pickLists to get origin sites for returned items. */
  const { pickLists } = await PickListServiceV2.getAllPickLists(
    {
      filters: {
        orderRequestItemIds: orderRequestItemIdsReturnedInParentTenant,
      },
    },
    parentUserContext,
  );

  /* Extracting out returned orderRequestItem's picked siteIds */
  const originSiteIdByOrderRequestItemId = pickLists.reduce((result: Map<string, StringObjectID>, pickList) => {
    pickList.pickListItems.forEach((item) => {
      result.set(item.orderRequestItemId.toString(), pickList.siteId.toString());
    });
    return result;
  }, new Map<string, StringObjectID>());

  const transactionEntities: TransactionEntity.CreateMoveTransactionsInput['entities'] = [];
  for (let index = 0; index < orderRequestItemIdsReturnedInChildTenant.length; index++) {
    const { [index]: orderRequestItemIdInChildTenant } = orderRequestItemIdsReturnedInChildTenant;
    const { [orderRequestItemIdInChildTenant]: trackingDetailsOfOrderRequestItemIdInChildTenant } =
      trackingDetailsByOrderRequestItemIdInChildTenant;
    trackingDetailsOfOrderRequestItemIdInChildTenant.forEach((trackingDetail) => {
      const correspondingOrderRequestItemInChildTenant = orderRequestItemsReturnedInPackedStatusInChildTenant.find(
        (orderRequestItem) => orderRequestItem._id.toString() === orderRequestItemIdInChildTenant.toString(),
      );
      if (!correspondingOrderRequestItemInChildTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `OrderRequestItem corresponding to ${orderRequestItemIdInChildTenant} could not be found. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
          params: {
            orderRequestItemsReturnedInPackedStatusInChildTenant,
            orderRequestItemIdInChildTenant,
          },
        });
      }
      const correspondingOrderRequestItemInParentTenant = orderRequestItemsReturnedInPackedStatusInParentTenant.find(
        (orderRequestItem) =>
          orderRequestItem._id.toString() === correspondingOrderRequestItemInChildTenant.entityIdInSourceTenant?.toString(),
      );
      if (!correspondingOrderRequestItemInParentTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `OrderRequestItem corresponding to ${correspondingOrderRequestItemInChildTenant.entityIdInSourceTenant} could not be found. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
          params: {
            orderRequestItemsReturnedInPackedStatusInChildTenant,
            entityIdSourceTenant: correspondingOrderRequestItemInChildTenant.entityIdInSourceTenant,
          },
        });
      }
      const originSiteIdForOrderRequestItemInParentTenant = originSiteIdByOrderRequestItemId.get(
        correspondingOrderRequestItemInParentTenant._id.toString(),
      ) as StringObjectID;
      if (!originSiteIdForOrderRequestItemInParentTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `Could not determine origin siteId of orderRequestItemId ${correspondingOrderRequestItemInParentTenant?._id}. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${parseReturnedOrderRequestItemsForParentTenant.name}`,
          params: {
            orderRequestItemsReturnedInPackedStatusInParentTenant,
            originSiteIdByOrderRequestItemId,
          },
        });
      }
      transactionEntities.push({
        entityId: correspondingOrderRequestItemInParentTenant?.itemId as StringObjectID,
        entityType:
          (correspondingOrderRequestItemInParentTenant?.sku as string).slice(0, 3) === 'INV'
            ? TransactionEntity.TransactionEntityTypeEnum.INVENTORY
            : TransactionEntity.TransactionEntityTypeEnum.ASSET,
        sourceSiteId: originSiteIdForOrderRequestItemInParentTenant,
        sourceLocationId: originSiteIdForOrderRequestItemInParentTenant,
        destinationSiteId: orderRequestInParentTenant.destinationSiteId,
        destinationLocationId: orderRequestInParentTenant.destinationSiteId,
        quantity: trackingDetail.quantity,
        billToSiteId: orderRequestInParentTenant.billToSiteId,
        departmentId: orderRequestInParentTenant.departmentId,
        meta: {
          orderRequestItemId: correspondingOrderRequestItemInParentTenant?._id,
          orderRequestId: orderRequestInParentTenant._id,
          trackingIdInPartnerTenant: trackingDetail.trackingId,
        },
        projectId: correspondingOrderRequestItemInParentTenant?.projectId,
      });
    });
  }

  const createExternalOrderMoveTransactionForReturnInput: TransactionEntity.CreateMoveTransactionsInput = {
    type: TransactionEntity.TransactionTypeEnum.MOVE,
    subType: TransactionEntity.TransactionSubTypeEnum.EXTERNAL_ORDER_IN,
    status: TransactionEntity.TransactionStatusEnum.IN_TRANSIT,
    entities: transactionEntities,
  };

  const { transactions: createdMoveTransactions } = await TransactionService.createMoveTransactions(
    createExternalOrderMoveTransactionForReturnInput,
    parentUserContext,
  );

  if (!createdMoveTransactions) {
    throw new ForbiddenError({
      debugMessage: `User could not create move transaction in child tenant.`,
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      where: `${__filename} - ${createExternalOrderMoveTransactionForReturn.name}`,
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
