import { OrderRequestEntity, StringObjectID } from '@procurenetworks/inter-service-contracts';

export const isOrderRequestBlockedByOtherUser = (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  currentUserId: StringObjectID,
): boolean => {
  return (
    !!orderRequest.blockedStatus &&
    orderRequest.blockedStatus.blockedBy.toString() !== currentUserId.toString() &&
    new Date(orderRequest.blockedStatus.blockExpiresAt).getTime() > new Date().getTime()
  );
};
