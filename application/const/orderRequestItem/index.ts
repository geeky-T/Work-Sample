import { OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';

export const OrderRequestItemStatusWithNoDependentActionRequired = [
  OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
];

export const OrderRequestItemStatusWithDependentActionRequired = [
  OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
];

export const OrderRequestItemValidStatusSequence = [
  OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
  OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
];

export const OrderRequestItemVisibleStatusMapping = {
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED]: 'Back ordered',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED]: 'Cancelled',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED]: 'Closed',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED]: 'Delivered',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN]: 'Open',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY]: 'Out for delivery',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED]: 'Packed',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED]: 'Returned',
  [OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED]: 'Returned',
};
