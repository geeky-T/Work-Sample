import { OrderRequestEntity, OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';
import { ReturnAttachmentsForReturnNotificationPayload } from '../NotificationTypes/payloads';

export interface ExpandOrderEntitiesInput {
  orderRequest: OrderRequestEntity.OrderRequestSchema;
  /* For email payloads, only set those orderRequestItems that should appear in the email. */
  orderRequestItems?: Array<OrderRequestItemEntity.OrderRequestItemSchema>;
  returnAttachments?: ReturnAttachmentsForReturnNotificationPayload;
  deliveryAttachments?: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput['deliveryVerificationDetails'];
}
