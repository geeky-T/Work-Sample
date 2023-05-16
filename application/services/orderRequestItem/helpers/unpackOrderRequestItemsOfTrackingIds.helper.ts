/* eslint-disable no-param-reassign */
import { ResourceNotFoundError } from '@procurenetworks/backend-utils';
import {
  OrderRequestItemEntity,
  ShippingTransactionEntity,
  StringObjectID,
  TransactionEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { groupBy, omit, uniq } from 'lodash';
import mongoose from 'mongoose';
import {
  CreateOrderRequestItemRepositoryInput,
  UpdateOrderRequestItemRepositoryInput,
} from '../../../types/OrderRequestItem';
import { contextUserUtil } from '../../../utils/userAuthentication/contextUser.util';
import { OrderRequestItemServiceV2 } from '../orderRequestItem.service';
import { calculateStatusOfOrderRequestItemBasedOnTrackingDetails } from './orderRequestItemStatus.helper';

const mergeNotesOfTwoOrderRequestItems = (
  { note: noteFromFirst }: OrderRequestItemEntity.OrderRequestItemSchema,
  { note: noteFromSecond }: OrderRequestItemEntity.OrderRequestItemSchema,
): string | undefined => {
  if (noteFromFirst && !noteFromSecond) {
    return noteFromFirst;
  } else if (!noteFromFirst && noteFromSecond) {
    return noteFromSecond;
  } else if (!noteFromFirst && !noteFromSecond) {
    return noteFromFirst;
  } else if (noteFromFirst && noteFromSecond && noteFromFirst === noteFromSecond) {
    return noteFromFirst;
  } else {
    return `${noteFromFirst}\n--------------------------\n${noteFromSecond}`;
  }
};

export const parseUnpackOrderRequestItemsOfTrackingIds = async (
  { trackingIds }: OrderRequestItemEntity.UnpackOrderRequestItemsOfTrackingIdsInput,
  orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): Promise<{
  orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[];
  orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[];
}> => {
  const { currentUserInfo } = userContext;
  const orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[] = [];
  const orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[] = [];
  /** Fetching all open, back-ordered, delivered (unpacking returned items) orderRequestItems of orderRequests.
   * For the cases when the container that is unpacked contains returned item then
   * those will have to go back to delivered rather than open.
   */
  const { orderRequestItems: orderRequestItemsOfAllOrders } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
    {
      filters: {
        orderRequestIds: uniq(orderRequestItems.map(({ orderRequestId }) => orderRequestId)),
        statuses: [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        ],
      },
    },
    userContext,
  );
  /** Grouping orderRequestItems by orderRequestId. */
  const orderRequestItemsOfAllOrdersById = groupBy(orderRequestItemsOfAllOrders, ({ orderRequestId }) =>
    orderRequestId.toString(),
  );
  for (const orderRequestItem of orderRequestItems) {
    const { orderRequestId, projectId, sku, trackingDetails } = orderRequestItem;
    const { [orderRequestId.toString()]: orderRequestItemsOfOrder } = orderRequestItemsOfAllOrdersById;
    /** Finding if any orderRequestItem exists for same SKU, projectId & previous status of item being unpacked, so that we
     * update the orderRequestItem with quantity instead of creating a new one.
     */
    const orderRequestItemToUnpackInto = orderRequestItemsOfOrder?.find((item) => {
      if (item.sku === sku && item.projectId === projectId) {
        if (orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status === item.status) {
          /** Condition where the status is exactly equal. */
          return true;
        } else if (
          /** Condition where the status is among open & back-ordered. */
          [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          ].includes(orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status) &&
          [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          ].includes(item.status)
        ) {
          return true;
        }
      }
      return false;
    });
    /** Checking whether all the trackingDetails of current orderRequestItem is getting unpacked. */
    const isItemGettingUnpackCompletely = trackingDetails.every(({ trackingId }) => trackingIds.includes(trackingId));
    if (isItemGettingUnpackCompletely) {
      /** NOTE: All the unpacking of returned order request item will fall into this block because returned
       * orderRequestItem cannot be packed into multiple container. So, when unpacked they can only be
       * unpacked completely.
       */
      if (orderRequestItemToUnpackInto) {
        /** Adding the quantity of the unpacked item to the currently open or back-ordered item. */
        orderRequestItemsToUpdate.push({
          _id: orderRequestItemToUnpackInto._id,
          quantity: orderRequestItemToUnpackInto.quantity + orderRequestItem.quantity,
          nonRemovableNotes: (orderRequestItemToUnpackInto.nonRemovableNotes || []).concat(
            orderRequestItem.nonRemovableNotes || [],
          ),
          note: mergeNotesOfTwoOrderRequestItems(orderRequestItemToUnpackInto, orderRequestItem),
          updatedAt: userContext.requestTimestamp,
          updatedById: currentUserInfo._id,
        });
        /**
         * Deleting the currently packed item as it is now completely unpacked. Moving the trackingDetails that are unpacked to
         * trackingHistory by setting their status as unpacked.
         */
        orderRequestItemsToUpdate.push({
          _id: orderRequestItem._id,
          deletedAt: userContext.requestTimestamp,
          deletedById: currentUserInfo._id,
          trackingDetails: [],
          trackingHistory: trackingDetails.map((trackingDetail) => ({
            ...trackingDetail,
            status: ShippingTransactionEntity.ShippingTransactionStatusEnum.UNPACKED,
          })),
        });
      } else {
        /** Updating the same orderRequestItem. */
        orderRequestItemsToUpdate.push({
          _id: orderRequestItem._id,
          status: orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status,
          statusHistory: orderRequestItem.statusHistory.concat({
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            status: orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status,
            reason: `${orderRequestItem.quantity} unit(s) unpacked by ${currentUserInfo.email}`,
          }),
          parentOrderRequestItemId: undefined,
          trackingDetails: orderRequestItem.trackingDetails
            .concat(orderRequestItem.trackingHistory || [])
            .filter(({ status }) => status === ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED),
          trackingHistory: (orderRequestItem.trackingHistory || []).concat(
            orderRequestItem.trackingDetails.map((trackingDetail) => {
              if (trackingIds.includes(trackingDetail.trackingId)) {
                trackingDetail.status = ShippingTransactionEntity.ShippingTransactionStatusEnum.UNPACKED;
              }
              return trackingDetail;
            }),
          ),
          updatedById: currentUserInfo._id,
        });
      }
    } else if (!isItemGettingUnpackCompletely) {
      /* Extracting unpacked trackingDetails */
      const unpackedTrackingDetails = trackingDetails
        .filter(({ trackingId }) => trackingIds.includes(trackingId))
        .map((trackingDetail) => ({
          ...trackingDetail,
          status: ShippingTransactionEntity.ShippingTransactionStatusEnum.UNPACKED,
        }));
      /** Calculating the total quantity unpacked. */
      const quantityUnpacked = unpackedTrackingDetails.reduce(
        (result, trackingDetail) => (result += trackingDetail.quantity),
        0,
      );
      /** Extracting active trackingDetails */
      const activeTrackingDetails = trackingDetails.filter(({ trackingId }) => !trackingIds.includes(trackingId));
      const calculatedStatus = calculateStatusOfOrderRequestItemBasedOnTrackingDetails(
        activeTrackingDetails,
        !!orderRequestItem.parentOrderRequestItemId,
      );
      /**
       * Moving the trackingDetails that are unpacked to trackingHistory by setting their status as unpacked.
       * Keeping the active trackingDetails intact.
       */
      orderRequestItemsToUpdate.push({
        _id: orderRequestItem._id,
        quantity: orderRequestItem.quantity - quantityUnpacked,
        status: calculatedStatus,
        statusHistory:
          calculatedStatus !== orderRequestItem.status
            ? orderRequestItem.statusHistory.concat({
                createdAt: userContext.requestTimestamp,
                createdById: currentUserInfo._id,
                reason: 'Tracking update',
                status: calculatedStatus,
              })
            : orderRequestItem.statusHistory,
        trackingDetails: activeTrackingDetails,
        trackingHistory: orderRequestItem.trackingHistory.concat(unpackedTrackingDetails || []),
        updatedAt: userContext.requestTimestamp,
        updatedById: currentUserInfo._id,
      });
      if (orderRequestItemToUnpackInto) {
        /** Adding the quantity of the unpacked item to the currently open or back-ordered item. */
        orderRequestItemsToUpdate.push({
          _id: orderRequestItemToUnpackInto._id,
          quantity: orderRequestItemToUnpackInto.quantity + quantityUnpacked,
          nonRemovableNotes: (orderRequestItemToUnpackInto.nonRemovableNotes || []).concat(
            orderRequestItem.nonRemovableNotes || [],
          ),
          statusHistory: orderRequestItem.statusHistory.concat({
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            status: orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status,
            reason: `${orderRequestItem.quantity} unit(s) unpacked by ${currentUserInfo.email}`,
          }),
          note: mergeNotesOfTwoOrderRequestItems(orderRequestItemToUnpackInto, orderRequestItem),
          updatedAt: userContext.requestTimestamp,
          updatedById: currentUserInfo._id,
        });
      } else {
        /** Creating a new open orderRequestItem. */
        orderRequestItemsToCreate.push({
          _id: new mongoose.Types.ObjectId(),
          originalOrderRequestItemId: orderRequestItem._id,
          ...omit(orderRequestItem, ['_id', 'createdAt', 'updatedAt']),
          quantity: quantityUnpacked,
          createdById: currentUserInfo._id,
          status: orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status,
          statusHistory: orderRequestItem.statusHistory.concat({
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            status: orderRequestItem.statusHistory[orderRequestItem.statusHistory.length - 2].status,
            reason: `${quantityUnpacked} unit(s) unpacked by ${currentUserInfo.email}`,
          }),
          trackingDetails: [],
          trackingHistory: [],
          updatedById: currentUserInfo._id,
        });
      }
    }
  }
  return { orderRequestItemsToCreate, orderRequestItemsToUpdate };
};

export const parseUnpackOrderRequestItemsOfParentTrackingIds = async (
  orderRequestItemsOfChildTenants: OrderRequestItemEntity.OrderRequestItemSchema[],
  orderRequestItemsToCreateInParentTenant: CreateOrderRequestItemRepositoryInput[],
  orderRequestItemsToUpdateInParentTenant: UpdateOrderRequestItemRepositoryInput[],
  parentUserContext: UserContext,
): Promise<{
  orderRequestItemsToCreate: CreateOrderRequestItemRepositoryInput[];
  orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[];
  inTransitTransactionIdsToDeleteByChildTenantId: Record<string, StringObjectID[]>;
}> => {
  const orderRequestItemsToCreateInChildTenant: CreateOrderRequestItemRepositoryInput[] = [];
  const orderRequestItemsToUpdateInChildTenant: UpdateOrderRequestItemRepositoryInput[] = [];
  const inTransitTransactionIdsToDeleteByChildTenantId: Record<string, StringObjectID[]> = {};
  const childTenantIds = uniq(orderRequestItemsOfChildTenants.map(({ tenantId }) => tenantId.toString()));

  for (const childTenantId of childTenantIds) {
    const childUserContext = contextUserUtil.switchTenantForInternalUsage(parentUserContext, childTenantId);

    inTransitTransactionIdsToDeleteByChildTenantId[childTenantId] = [];

    const orderRequestItemsOfChildTenant = orderRequestItemsOfChildTenants.filter(
      ({ tenantId }) => tenantId.toString() === childTenantId,
    );

    /** Fetching all open, back-ordered, delivered (unpacking returned items) orderRequestItems of orderRequests.
     * For the cases when the container that is unpacked contains returned item then
     * those will have to go back to delivered rather than open.
     */
    const { orderRequestItems: orderRequestItemsOfAllOrders } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
      {
        filters: {
          orderRequestIds: uniq(orderRequestItemsOfChildTenant.map(({ orderRequestId }) => orderRequestId)),
          statuses: [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
          ],
        },
      },
      childUserContext,
    );

    for (const orderRequestItemToUpdateInParentTenant of orderRequestItemsToUpdateInParentTenant) {
      const { _id: orderRequestItemIdInParentTenant } = orderRequestItemToUpdateInParentTenant;
      let correspondingOrderRequestItemInChildTenant = orderRequestItemsOfAllOrders.find(
        ({ entityIdInSourceTenant }) => orderRequestItemIdInParentTenant.toString() === entityIdInSourceTenant?.toString(),
      );
      if (!correspondingOrderRequestItemInChildTenant) {
        correspondingOrderRequestItemInChildTenant = orderRequestItemsOfChildTenant.find(
          ({ entityIdInSourceTenant }) => orderRequestItemIdInParentTenant.toString() === entityIdInSourceTenant?.toString(),
        );
        if (!correspondingOrderRequestItemInChildTenant) {
          throw new ResourceNotFoundError({
            debugMessage: `Item corresponding to the ${orderRequestItemIdInParentTenant} was not found in child tenant. Possibility of data corruption.`,
            message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
            where: `${__filename} - ${parseUnpackOrderRequestItemsOfParentTrackingIds.name}`,
            params: { orderRequestItemsToUpdateInParentTenant, orderRequestItemIdInParentTenant },
          });
        }
      }

      const fieldsUpdatedInParentTenant = Object.keys(orderRequestItemToUpdateInParentTenant);

      const orderRequestItemToUpdateInChildTenant: UpdateOrderRequestItemRepositoryInput = {
        _id: correspondingOrderRequestItemInChildTenant._id,
      };
      for (const field of fieldsUpdatedInParentTenant) {
        switch (field) {
          case '_id':
            orderRequestItemToUpdateInChildTenant._id = correspondingOrderRequestItemInChildTenant._id;
            break;
          case 'quantity':
            orderRequestItemToUpdateInChildTenant.quantity =
              orderRequestItemToUpdateInParentTenant.quantity || correspondingOrderRequestItemInChildTenant.quantity;
            break;
          case 'status':
            orderRequestItemToUpdateInChildTenant.status =
              orderRequestItemToUpdateInParentTenant.status || correspondingOrderRequestItemInChildTenant.status;
            break;
          case 'statusHistory':
            orderRequestItemToUpdateInChildTenant.statusHistory =
              orderRequestItemToUpdateInParentTenant.statusHistory ||
              correspondingOrderRequestItemInChildTenant.statusHistory;
            break;
          case 'updatedAt':
            orderRequestItemToUpdateInChildTenant.updatedAt =
              orderRequestItemToUpdateInParentTenant.updatedAt || correspondingOrderRequestItemInChildTenant.updatedAt;
            break;
          case 'updatedById':
            orderRequestItemToUpdateInChildTenant.updatedById =
              orderRequestItemToUpdateInParentTenant.updatedById || correspondingOrderRequestItemInChildTenant.updatedById;
            break;
          case 'nonRemovableNotes':
            orderRequestItemToUpdateInChildTenant.nonRemovableNotes =
              orderRequestItemToUpdateInParentTenant.nonRemovableNotes ||
              correspondingOrderRequestItemInChildTenant.nonRemovableNotes;
            break;
          case 'note':
            orderRequestItemToUpdateInChildTenant.note =
              orderRequestItemToUpdateInParentTenant.note || correspondingOrderRequestItemInChildTenant.note;
            break;
          case 'deletedAt':
            orderRequestItemToUpdateInChildTenant.deletedAt =
              orderRequestItemToUpdateInParentTenant.deletedAt || correspondingOrderRequestItemInChildTenant.deletedAt;
            break;
          case 'deletedById':
            orderRequestItemToUpdateInChildTenant.deletedById =
              orderRequestItemToUpdateInParentTenant.deletedById || correspondingOrderRequestItemInChildTenant.deletedById;
            break;
          case 'parentOrderRequestItemId':
            orderRequestItemToUpdateInChildTenant.parentOrderRequestItemId =
              orderRequestItemToUpdateInParentTenant.parentOrderRequestItemId ||
              correspondingOrderRequestItemInChildTenant.parentOrderRequestItemId;
            break;
          case 'trackingDetails':
            orderRequestItemToUpdateInChildTenant.transactionDetails =
              orderRequestItemToUpdateInParentTenant.trackingDetails?.map((trackingDetail) => {
                const correspondingTransactionDetail = (correspondingOrderRequestItemInChildTenant?.transactionDetails || [])
                  .concat(correspondingOrderRequestItemInChildTenant?.transactionHistory || [])
                  .find((transactionDetail) => transactionDetail.trackingIdInPartnerTenant === trackingDetail.trackingId);
                return {
                  quantity: trackingDetail.quantity,
                  status:
                    trackingDetail.status === ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED
                      ? TransactionEntity.TransactionStatusEnum.COMPLETED
                      : TransactionEntity.TransactionStatusEnum.DELETED,
                  trackingIdInPartnerTenant: trackingDetail.trackingId,
                  transactionId: correspondingTransactionDetail?.transactionId as string,
                };
              });
            break;
          case 'trackingHistory':
            orderRequestItemToUpdateInChildTenant.transactionHistory =
              orderRequestItemToUpdateInParentTenant.trackingHistory?.map((trackingDetail) => {
                const correspondingTransactionDetail = (correspondingOrderRequestItemInChildTenant?.transactionDetails || [])
                  .concat(correspondingOrderRequestItemInChildTenant?.transactionHistory || [])
                  .find((transactionDetail) => transactionDetail.trackingIdInPartnerTenant === trackingDetail.trackingId);
                if (trackingDetail.status === ShippingTransactionEntity.ShippingTransactionStatusEnum.UNPACKED) {
                  inTransitTransactionIdsToDeleteByChildTenantId[childTenantId].push(
                    correspondingTransactionDetail?.transactionId as StringObjectID,
                  );
                }
                return {
                  quantity: trackingDetail.quantity,
                  status:
                    trackingDetail.status === ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED
                      ? TransactionEntity.TransactionStatusEnum.COMPLETED
                      : TransactionEntity.TransactionStatusEnum.DELETED,
                  trackingIdInPartnerTenant: trackingDetail.trackingId,
                  transactionId: correspondingTransactionDetail?.transactionId as string,
                };
              });
            break;
          default:
            break;
        }
      }
      orderRequestItemsToUpdateInChildTenant.push(orderRequestItemToUpdateInChildTenant);
    }

    for (const orderRequestItemToCreateInParentTenant of orderRequestItemsToCreateInParentTenant) {
      const { _id: orderRequestItemIdInParentTenant, originalOrderRequestItemId } = orderRequestItemToCreateInParentTenant;
      let correspondingOrderRequestItemInChildTenant = orderRequestItemsOfAllOrders.find(
        ({ _id }) => _id.toString() === orderRequestItemToCreateInParentTenant.originalOrderRequestItemId?.toString(),
      );
      if (!correspondingOrderRequestItemInChildTenant) {
        correspondingOrderRequestItemInChildTenant = orderRequestItemsOfChildTenant.find(
          ({ entityIdInSourceTenant }) => orderRequestItemIdInParentTenant.toString() === entityIdInSourceTenant?.toString(),
        );
      }
      if (!correspondingOrderRequestItemInChildTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `OrderRequestItem corresponding to the ${originalOrderRequestItemId} was not found in child tenant. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${parseUnpackOrderRequestItemsOfParentTrackingIds.name}`,
          params: { orderRequestItemToCreateInParentTenant, originalOrderRequestItemId },
        });
      }

      orderRequestItemsToCreateInChildTenant.push({
        ...correspondingOrderRequestItemInChildTenant,
        ...orderRequestItemToCreateInParentTenant,
        itemId: correspondingOrderRequestItemInChildTenant._id,
        projectId: correspondingOrderRequestItemInChildTenant.projectId,
        categoryId: correspondingOrderRequestItemInChildTenant.categoryId,
        entityIdInSourceTenant: orderRequestItemIdInParentTenant,
        orderRequestId: correspondingOrderRequestItemInChildTenant.orderRequestId,
        parentOrderRequestItemId: correspondingOrderRequestItemInChildTenant.parentOrderRequestItemId,
        tenantId: correspondingOrderRequestItemInChildTenant.tenantId,
        trackingDetails: [],
        trackingHistory: [],
        transactionDetails: [],
        transactionHistory: [],
      });
    }
  }

  return {
    orderRequestItemsToCreate: orderRequestItemsToCreateInChildTenant,
    orderRequestItemsToUpdate: orderRequestItemsToUpdateInChildTenant,
    inTransitTransactionIdsToDeleteByChildTenantId,
  };
};
