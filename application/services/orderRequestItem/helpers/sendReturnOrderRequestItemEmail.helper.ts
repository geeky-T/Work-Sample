import { ReturnNotificationPayloadInput } from '@custom-types/NotificationTypes/payloads';
import { InternalServerError, logger } from '@procurenetworks/backend-utils';
import { OrderRequestEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { EmailService } from '@services/externals/EmailServiceV3';
import { OrderRequestItemServiceV2 } from '@services/orderRequestItem/orderRequestItem.service';
import { ShippingContainerService } from '@transport/__grpc/client/services';
import { expandOrderEntities } from '@utils/expandOrderEntities';

export const sendReturnOrderRequestItemEmailBasedOnTrackingId = async (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  trackingId: string,
  userContext: UserContext,
): Promise<void> => {
  const { orderRequestItems: returnedOrderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
    { filters: { trackingIds: [trackingId] } },
    userContext,
  );
  const { shippingContainers: packageContainers } = await ShippingContainerService.getShippingContainersOfTrackingId(
    { trackingId: returnedOrderRequestItems[0].trackingDetails[0].trackingId },
    userContext,
  );
  if (!packageContainers[0].qrCodeImage) {
    logger.error({
      message: `Cannot find qrCodeImage in container ${JSON.stringify(packageContainers)}`,
    });
    throw new InternalServerError({
      error: new Error('Unknown error - Unable to send return email notification'),
      debugMessage: 'Unknown error - Unable to send return email notification.',
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      params: {
        orderRequest,
        trackingId,
        returnedOrderRequestItems,
        packageContainers,
      },
      report: true,
      where: `${__filename} - ${sendReturnOrderRequestItemEmailBasedOnTrackingId.name}`,
    });
  }
  const [orderRequestEmailPayload] = await expandOrderEntities(
    [
      {
        orderRequest,
        orderRequestItems: returnedOrderRequestItems,
        returnAttachments: {
          containerId: packageContainers[0].containerId,
          destinationSiteId: packageContainers[0].destinationSiteId,
          qrCodeImage: packageContainers[0].qrCodeImage,
        },
      },
    ],
    userContext,
  );
  await EmailService.sendOrderRequestItemReturnedNotification(
    orderRequestEmailPayload as ReturnNotificationPayloadInput,
    userContext,
  );
};
