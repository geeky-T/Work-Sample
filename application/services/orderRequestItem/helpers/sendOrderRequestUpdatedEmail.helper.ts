import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestEntity, OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { expandOrderEntities } from '../../../utils/expandOrderEntities';
import { EmailService } from '../../externals/EmailServiceV3';
import { shouldCancelOrderRequest, shouldCloseOrderRequest } from '../../orderRequest/helpers/orderRequestUtils.helper';

export type SendOrderRequestUpdatedEmailForStatusUpdateInput = {
  orderRequest: OrderRequestEntity.OrderRequestSchema;
  existingOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[];
  modifiedOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[];
};

export const sendOrderRequestUpdatedEmailForStatusUpdates = async (
  sendOrderRequestUpdatedEmailForStatusUpdateInputs: SendOrderRequestUpdatedEmailForStatusUpdateInput[],
  userContext: UserContext,
): Promise<void> => {
  for (const input of sendOrderRequestUpdatedEmailForStatusUpdateInputs) {
    try {
      const { orderRequest, existingOrderRequestItems, modifiedOrderRequestItems } = input;

      const finalOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
      const orderRequestItemsWithStatusUpdatedToBackOrdered: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
      existingOrderRequestItems.forEach((orderRequestItem) => {
        const modifiedOrderRequestItem = modifiedOrderRequestItems.find(
          ({ _id }) => orderRequestItem._id.toString() === _id.toString(),
        );
        if (modifiedOrderRequestItem) {
          if (
            modifiedOrderRequestItem?.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED &&
            modifiedOrderRequestItem.status !== orderRequestItem.status
          ) {
            orderRequestItemsWithStatusUpdatedToBackOrdered.push(modifiedOrderRequestItem);
          }
          finalOrderRequestItems.push(modifiedOrderRequestItem);
        } else {
          finalOrderRequestItems.push(orderRequestItem);
        }
      });

      /** Sending email notification because status of some or all items of the order request has changed. */

      if (shouldCancelOrderRequest(finalOrderRequestItems)) {
        const [orderRequestEmailPayload] = await expandOrderEntities(
          [
            {
              orderRequest,
              orderRequestItems: finalOrderRequestItems,
            },
          ],
          userContext,
        );
        EmailService.sendOrderRequestCancelledNotification(orderRequestEmailPayload, userContext);
      } else if (
        shouldCloseOrderRequest(finalOrderRequestItems).plan === OrderRequestEntity.OrderRequestClosePlanEnum.CLOSE
      ) {
        /** Sending order request status updated email to relevant officials of current tenant. */
        /** SUSPENDED TASK-> OR-531. */
        // EmailService.sendOrderRequestStatusUpdatedNotification(
        //   { ...emailPayload, status: ORDER_STATUS.CLOSED },
        //   tenantId,
        // );
      } else if (orderRequestItemsWithStatusUpdatedToBackOrdered.length > 0) {
        const [orderRequestEmailPayload] = await expandOrderEntities(
          [
            {
              orderRequest,
              orderRequestItems: finalOrderRequestItems,
            },
          ],
          userContext,
        );
        EmailService.sendOrderRequestBackOrderedNotification(orderRequestEmailPayload, userContext);
      } else {
        /** Sending order request updated email to relevant officials of current tenant. */
        /** SUSPENDED TASK-> OR-531. */
        // orderRequestEmailPayload.items = orderRequestEmailPayload.items.filter(
        //   (item) => item._id.toString() === orderRequestItemId,
        // );
        // EmailService.sendOrderRequestUpdatedNotification(orderRequestEmailPayload, tenantId);
      }
    } catch (error) {
      logger.error({ error, message: 'Error in sending notification.', params: { input } });
    }
  }
};
