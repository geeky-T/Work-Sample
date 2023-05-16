import { OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';

const isAnyItemInOpen = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN);
const isAnyItemInBackOrdered = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED);
const isAnyItemInPacked = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED);
const isAnyItemInShipped = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY);
const isAnyItemInPickedUpOrDelivered = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED);
const isAnyItemInReturned = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  !!orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED);
const isAnyItemInCancelled = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  orderRequestItems.some((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED);
const isAllItemInClosed = (orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = []) =>
  orderRequestItems.every((item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED);

export const parseLeastOrderRequestItemStatus = (
  orderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
): OrderRequestItemEntity.OrderRequestItemStatusEnum | undefined => {
  const orderRequestItemsExcludingNOSku = orderRequestItems.filter(
    (item) => item.type !== OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU,
  );
  /** Case when all the order request items in the order are non stocked items. */
  if (orderRequestItemsExcludingNOSku.length === 0) {
    if (isAnyItemInOpen(orderRequestItems) || isAnyItemInBackOrdered(orderRequestItems)) {
      return OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED;
    }
    if (isAnyItemInCancelled(orderRequestItems)) {
      return OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED;
    }
    if (isAllItemInClosed(orderRequestItems)) {
      return OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED;
    }
  }

  if (isAnyItemInOpen(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN;
  }
  if (isAnyItemInBackOrdered(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED;
  }
  /** Case when there are some non stocked items and some stocked items */
  if (orderRequestItemsExcludingNOSku.length !== orderRequestItems.length) {
    if (isAnyItemInOpen(orderRequestItems) || isAnyItemInBackOrdered(orderRequestItems)) {
      return OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED;
    }
  }
  if (isAnyItemInPacked(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED;
  }
  if (isAnyItemInShipped(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY;
  }
  if (isAnyItemInPickedUpOrDelivered(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED;
  }
  if (isAnyItemInReturned(orderRequestItemsExcludingNOSku)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED;
  }
  if (isAnyItemInCancelled(orderRequestItems)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED;
  }
  if (isAllItemInClosed(orderRequestItems)) {
    return OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED;
  }
};
