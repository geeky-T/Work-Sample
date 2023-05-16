import { ForbiddenError, logger, ResourceNotFoundError, ValidationError } from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { isOrderRequestBlockedByOtherUser } from '@utils/orderRequestBlockedStatus.util';
import { isValidObjectId } from 'mongoose';
import { LocationService } from '../../../transport/__grpc/client/services';
import { OrderRequestItemServiceV2 } from '../../orderRequestItem/orderRequestItem.service';

const validateOrderRequestId = (orderId: StringObjectID) => {
  if (!orderId || !isValidObjectId(orderId)) {
    throw new ValidationError({
      debugMessage: `Invalid Order Request Id provided - ${orderId}`,
      message: 'Please provide valid Order Request Id!',
      params: { orderId },
      where: `${__filename} - validateOrderRequestId`,
    });
  }
};

function validateBillToSiteId(billToSiteId: StringObjectID) {
  if (!billToSiteId || !isValidObjectId(billToSiteId)) {
    throw new ValidationError({
      debugMessage: `Invalid/Missing billToSiteId - ${billToSiteId}`,
      message: 'Please select a Bill To site.',
      params: { billToSiteId },
      where: `${__filename} - validateCreateOrderRequestInput`,
    });
  }
}

function validateDestinationSiteId(destinationSiteId: StringObjectID) {
  if (!destinationSiteId || !isValidObjectId(destinationSiteId)) {
    throw new ValidationError({
      debugMessage: `Invalid/Missing destinationSiteId - ${destinationSiteId}`,
      message: 'Please select a Ship To site.',
      params: { destinationSiteId },
      where: `${__filename} - validateCreateOrderRequestInput`,
    });
  }
}

async function validateSitesOfOrder(
  billToSiteId: StringObjectID,
  destinationSiteId: StringObjectID,
  userContext: UserContext,
) {
  const siteIdsOfOrder = [billToSiteId, destinationSiteId];

  logger.debug({ message: 'VALIDATE ORDER: Fetching User authorized sites' });
  const { locations: sites } = await LocationService.getLocationsByIdsAcrossTenants(
    { filters: { locationIds: siteIdsOfOrder } },
    userContext,
  );

  if (sites.length !== siteIdsOfOrder.length) {
    const billToSite = sites.find((site) => site._id.toString() === billToSiteId.toString());
    if (!billToSite) {
      throw new ForbiddenError({
        debugMessage: `Invalid/Unauthorized Bill To Site selected. - ${billToSiteId}`,
        message: 'Please select a Bill To site for which you are authorized.',
        params: { billToSiteId },
        where: `${__filename} - validateCreateOrderRequestInput`,
      });
    }
    const destinationSite = sites.find((site) => site._id.toString() === destinationSiteId.toString());
    if (!destinationSite) {
      throw new ForbiddenError({
        debugMessage: `Invalid/Unauthorized destinationSiteId provided - ${destinationSiteId}`,
        message: 'Please select a Ship To site for which you are authorized.',
        params: { destinationSiteId },
        where: `${__filename} - validateCreateOrderRequestInput`,
      });
    }
  }
}

export const validateCreateOrderRequestInput = async (
  createOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
  userContext: UserContext,
): Promise<void> => {
  const { dueDate, destinationSiteId, billToSiteId, items } = createOrderRequestInput;
  if (
    !dueDate ||
    !Date.parse(dueDate) ||
    new Date(new Date(dueDate).setUTCHours(12, 0, 0, 0)).toISOString() <
      new Date(new Date().setUTCHours(12, 0, 0, 0)).toISOString()
  ) {
    throw new ValidationError({
      report: false,
      debugMessage: `Invalid/Missing/Past dueDate - ${dueDate}`,
      message: 'Please enter a due date that is in the future.',
      params: { dueDate },
      where: `${__filename} - validateCreateOrderRequestInput`,
    });
  }

  validateDestinationSiteId(destinationSiteId);

  validateBillToSiteId(billToSiteId);

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError({
      debugMessage: `Invalid or No items in the create order request - ${items}`,
      message: 'Please add at least one item to create your order request.',
      params: { items },
      where: `${__filename} - validateCreateOrderRequestInput`,
    });
  }

  await validateSitesOfOrder(billToSiteId, destinationSiteId, userContext);
};

export const validateDeleteOrderRequestInput = ({ orderRequestId }: OrderRequestEntity.DeleteOrderRequestInput): void => {
  validateOrderRequestId(orderRequestId);
};

export const validateUpdateOrderRequestInput = async (
  updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
  userContext: UserContext,
  existingOrderRequest?: OrderRequestEntity.OrderRequestSchema,
): Promise<void> => {
  const { orderRequestId, updates } = updateOrderRequestInput;
  const { destinationSiteId, billToSiteId, items } = updates;

  if (!existingOrderRequest) {
    throw new ForbiddenError({
      debugMessage: `Order request with id: ${orderRequestId} is not accessible to the user.`,
      message: `The order request you are trying to edit is not accessible to you. Please refresh and try again`,
      params: { ...updateOrderRequestInput },
      where: `${__filename} - ${validateUpdateOrderRequestInput.name}`,
    });
  }

  validateOrderRequestId(orderRequestId);
  validateDestinationSiteId(destinationSiteId);
  validateBillToSiteId(billToSiteId);

  if (!items || items.length === 0) {
    throw new ValidationError({
      debugMessage: `Invalid/Missing items`,
      message: 'Please add at least one item to create your order request.',
      params: { items },
      report: true,
      where: `${__filename} - ${validateUpdateOrderRequestInput.name}`,
    });
  }

  await validateSitesOfOrder(billToSiteId, destinationSiteId, userContext);

  if (
    existingOrderRequest.billToSiteId.toString() !== updates.billToSiteId.toString() ||
    existingOrderRequest.deliverToId?.toString() !== updates.deliverToId?.toString() ||
    existingOrderRequest.departmentId?.toString() !== updates.departmentId?.toString() ||
    existingOrderRequest.destinationSiteId?.toString() !== updates.destinationSiteId?.toString()
  ) {
    /** Checking if all items are in open or back-ordered status as this update contains updates in the field of order request. */
    const { orderRequestItems } = await OrderRequestItemServiceV2.getOrderRequestItemsByOrderRequestIdsAcrossTenants({
      filters: { orderRequestIds: [orderRequestId] },
      projection: { status: 1 },
    });
    if (
      !orderRequestItems.every((orderRequestItem) =>
        [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
        ].includes(orderRequestItem.status),
      )
    ) {
      throw new ValidationError({
        debugMessage: `Failed to update order request as it is already in process.`,
        message: 'This order is in process of delivery and cannot be edited. Please recheck the order.',
        params: { ...updateOrderRequestInput },
        where: `${__filename} - validateUpdateOrderRequestInput`,
      });
    }
  }
};

export const validateBlockOrderRequest = (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  userContext: UserContext,
): void => {
  if (orderRequest.entitySource === Entity.EntitySourceEnum.EXTERNAL) {
    throw new ForbiddenError({
      debugMessage: 'You are not authorized to pick and pack this order. Please contact an administrator for assistance.',
      message: 'You are not authorized to pick and pack this order. Please contact an administrator for assistance.',
      params: { orderRequest },
      where: `${__filename} - ${validateBlockOrderRequest.name}`,
    });
  } else if (isOrderRequestBlockedByOtherUser(orderRequest, userContext.currentUserInfo._id)) {
    throw new ValidationError({
      report: false,
      debugMessage: `Order to block is already blocked by other user.`,
      message: 'This order is in the process of being picked and packed for delivery. Please select another order.',
      params: { orderRequest },
      where: `${__filename} - validateBlockOrderRequest`,
    });
  }
};

export const validateUnblockOrderRequest = (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  userContext: UserContext,
): void => {
  if (!orderRequest) {
    throw new ResourceNotFoundError({
      debugMessage: `Order to unblock not found.`,
      message: 'This order is not available. Please recheck the order or select a different order.',
      params: { orderRequest },
      where: `${__filename} - validateUnblockOrderRequest`,
    });
  } else if (isOrderRequestBlockedByOtherUser(orderRequest, userContext.currentUserInfo._id)) {
    throw new ValidationError({
      report: false,
      debugMessage: `Order to block is already blocked by other user.`,
      message: 'This order is in the process of being picked and packed for delivery. Please select another order.',
      params: { orderRequest },
      where: `${__filename} - validateUnblockOrderRequest`,
    });
  }
};
