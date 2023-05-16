import { ValidationError } from '@procurenetworks/backend-utils';
import { OrderRequestItemEntity, ShippingTransactionEntity } from '@procurenetworks/inter-service-contracts';

export const calculateStatusOfOrderRequestItemBasedOnTrackingDetails = (
  trackingDetails: OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[],
  isOrderRequestItemInReturnProcess: boolean,
): OrderRequestItemEntity.OrderRequestItemStatusEnum => {
  const groupObject = {
    [ShippingTransactionEntity.ShippingTransactionStatusEnum.PACKED]: 0,
    [ShippingTransactionEntity.ShippingTransactionStatusEnum.OUT_FOR_DELIVERY]: 0,
    [ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED]: 0,
    [ShippingTransactionEntity.ShippingTransactionStatusEnum.UNPACKED]: 0,
  };
  trackingDetails.forEach((trackingDetail) => groupObject[trackingDetail.status]++);
  if (groupObject[ShippingTransactionEntity.ShippingTransactionStatusEnum.PACKED]) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED;
  } else if (groupObject[ShippingTransactionEntity.ShippingTransactionStatusEnum.OUT_FOR_DELIVERY]) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY;
  } else if (groupObject[ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED]) {
    if (isOrderRequestItemInReturnProcess) {
      return OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED;
    }
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED;
  }
  throw new ValidationError({
    debugMessage: 'Tracking detail in unpacked status should only be in trackingHistory.',
    message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
    params: { trackingDetails, isOrderRequestItemInReturnProcess },
    where: 'orderRequestItemStatusHelper - calculateStatusOfOrderRequestItemBasedOnTrackingDetails',
  });
};
