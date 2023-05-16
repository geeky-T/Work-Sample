import {
  OrderRequestItemEntity,
  ShippingTransactionEntity,
  StringObjectID,
  TransactionEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { UpdateOrderRequestItemRepositoryInput } from '../../../types/OrderRequestItem';
import { calculateStatusOfOrderRequestItemBasedOnTrackingDetails } from './orderRequestItemStatus.helper';

export const parseUpdateOrderRequestItemsStatusByTrackingUpdates = (
  correspondingOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  trackingUpdates: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput['updates'],
  userContext: UserContext,
): {
  orderRequestItemsWithStatusUpdates: Array<UpdateOrderRequestItemRepositoryInput>;
  orderRequestItemsWithTrackingDetailsUpdates: Array<UpdateOrderRequestItemRepositoryInput>;
} => {
  const { currentUserInfo } = userContext;
  const orderRequestItemsWithStatusUpdates: Array<UpdateOrderRequestItemRepositoryInput> = [];
  const orderRequestItemsWithTrackingDetailsUpdates: Array<UpdateOrderRequestItemRepositoryInput> = [];
  correspondingOrderRequestItems.forEach((orderRequestItem) => {
    const updatedTrackingDetails: OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[] =
      orderRequestItem.trackingDetails.map((trackingDetail) => {
        const newTrackingStatus = trackingUpdates.find(
          (trackingUpdate) => trackingUpdate.trackingId === trackingDetail.trackingId,
        );
        if (newTrackingStatus) {
          return {
            ...trackingDetail,
            status: newTrackingStatus.status,
          };
        }
        return trackingDetail;
      });
    const orderRequestItemToUpdate = {
      _id: orderRequestItem._id,
      entityIdInSourceTenant: orderRequestItem.entityIdInSourceTenant,
      trackingDetails: updatedTrackingDetails,
      updatedAt: userContext.requestTimestamp,
      updatedById: currentUserInfo._id,
    };
    const calculatedStatus = calculateStatusOfOrderRequestItemBasedOnTrackingDetails(
      orderRequestItemToUpdate.trackingDetails,
      !!orderRequestItem.parentOrderRequestItemId,
    );
    if (calculatedStatus !== orderRequestItem.status) {
      orderRequestItemsWithStatusUpdates.push({
        ...orderRequestItemToUpdate,
        status: calculatedStatus,
        statusHistory: [
          ...orderRequestItem.statusHistory,
          {
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            reason: 'Tracking update',
            status: calculatedStatus,
          },
        ],
      });
    } else {
      orderRequestItemsWithTrackingDetailsUpdates.push(orderRequestItemToUpdate);
    }
  });
  return { orderRequestItemsWithStatusUpdates, orderRequestItemsWithTrackingDetailsUpdates };
};

export const parseUpdateOrderRequestItemsStatusByTrackingUpdatesInPartnerTenant = (
  orderRequestItemsInPartnerTenant: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  orderRequestItemsInCurrentTenant: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  orderRequestItemsToUpdateInCurrentTenant: Array<UpdateOrderRequestItemRepositoryInput>,
  trackingUpdates: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput['updates'],
  { currentUserInfo, requestTimestamp }: UserContext,
): {
  orderRequestItemsWithStatusUpdatesInPartnerTenant: Array<UpdateOrderRequestItemRepositoryInput>;
  orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant: Array<UpdateOrderRequestItemRepositoryInput>;
  transactionIdsToMarkComplete: StringObjectID[];
} => {
  const orderRequestItemsWithStatusUpdatesInPartnerTenant: Array<UpdateOrderRequestItemRepositoryInput> = [];
  const transactionIdsToMarkComplete: StringObjectID[] = [];
  const orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant: Array<UpdateOrderRequestItemRepositoryInput> = [];
  orderRequestItemsInPartnerTenant.forEach((orderRequestItem) => {
    const updatedTransactionDetails: OrderRequestItemEntity.OrderRequestItemTransactionDetailsSchema[] =
      orderRequestItem.transactionDetails.map((transactionDetail) => {
        const newTrackingStatus = trackingUpdates.find(
          (trackingUpdate) => trackingUpdate.trackingId === transactionDetail.trackingIdInPartnerTenant,
        );
        if (newTrackingStatus?.status === ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED) {
          transactionIdsToMarkComplete.push(transactionDetail.transactionId);
          return {
            ...transactionDetail,
            status: TransactionEntity.TransactionStatusEnum.COMPLETED,
          };
        }
        return transactionDetail;
      });
    const orderRequestItemToUpdate = {
      _id: orderRequestItem._id,
      transactionDetails: updatedTransactionDetails,
      updatedAt: requestTimestamp,
      updatedById: currentUserInfo._id,
    };
    const correspondingOrderRequestItemToUpdateInCurrentTenant = orderRequestItemsToUpdateInCurrentTenant.find(
      (orderRequestItemToUpdateInCurrentTenant) => {
        const correspondingOrderRequestItemInCurrentTenant = orderRequestItemsInCurrentTenant.find(
          ({ _id, entityIdInSourceTenant }) =>
            /** Tracking updates that needs to be propagated to child tenants incase of delivery of shipment. */
            orderRequestItem._id.toString() === entityIdInSourceTenant?.toString() ||
            /** Tracking updates that needs to be propagated to parent tenants incase of return shipment. */
            orderRequestItem.entityIdInSourceTenant?.toString() === _id.toString(),
        );
        return (
          orderRequestItemToUpdateInCurrentTenant._id.toString() ===
          correspondingOrderRequestItemInCurrentTenant?._id.toString()
        );
      },
    );
    if (
      correspondingOrderRequestItemToUpdateInCurrentTenant &&
      correspondingOrderRequestItemToUpdateInCurrentTenant.status !== orderRequestItem.status
    ) {
      orderRequestItemsWithStatusUpdatesInPartnerTenant.push({
        ...orderRequestItemToUpdate,
        status: correspondingOrderRequestItemToUpdateInCurrentTenant.status,
        statusHistory: correspondingOrderRequestItemToUpdateInCurrentTenant.statusHistory,
      });
    } else {
      orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant.push(orderRequestItemToUpdate);
    }
  });
  return {
    orderRequestItemsWithStatusUpdatesInPartnerTenant,
    orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant,
    transactionIdsToMarkComplete,
  };
};
