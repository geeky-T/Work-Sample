import { OrderRequestItemValidStatusSequence } from '@const/orderRequestItem';
import { ForbiddenError, logger, ResourceNotFoundError, StatusCodes, ValidationError } from '@procurenetworks/backend-utils';
import {
  OrderRequestEntity,
  OrderRequestItemEntity,
  ShippingTransactionEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { keyBy } from 'lodash';
import { isValidObjectId } from 'mongoose';

function _isStatusChangeValid(
  statusHistory: OrderRequestItemEntity.OrderRequestItemStatusHistorySchema[],
  updatedStatus: OrderRequestItemEntity.OrderRequestItemStatusEnum,
): boolean {
  switch (updatedStatus) {
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN:
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED:
      return true;
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED:
      throw new ValidationError({
        message: 'Item can only be packed from pick and pack section in mobile application.',
        params: { statusHistory, updatedStatus },
        report: false,
        where: `${__filename} - _isStatusChangeValid`,
      });
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY:
      throw new ValidationError({
        message:
          'Item can only be moved to out for delivery by "Add Delivery" through shipping section in mobile application.',
        params: { statusHistory, updatedStatus },
        report: false,
        where: `${__filename} - _isStatusChangeValid`,
      });
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED:
      const indexOfDeliveredStatusHistory = statusHistory.findIndex(
        (history) => history.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
      );
      if (indexOfDeliveredStatusHistory < 0) {
        throw new ValidationError({
          message: 'Item can only be returned once delivered or picked up.',
          params: { statusHistory, updatedStatus },
          report: false,
          where: `${__filename} - _isStatusChangeValid`,
        });
      } else if (
        statusHistory.length - 1 > indexOfDeliveredStatusHistory &&
        ![
          OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
        ].includes(statusHistory[statusHistory.length - 1].status)
      ) {
        throw new ValidationError({
          message: 'Items can only be marked "Returned" once they have been packed for return through "Return Items" flow.',
          params: { statusHistory, updatedStatus },
          report: false,
          where: `${__filename} - _isStatusChangeValid`,
        });
      }
      return true;
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED:
      if (
        ![
          OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
        ].includes(statusHistory[statusHistory.length - 1].status)
      ) {
        throw new ValidationError({
          message: 'Item cannot be delivered before being packed.',
          params: { statusHistory, updatedStatus },
          report: false,
          where: `${__filename} - _isStatusChangeValid`,
        });
      }
      return true;
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED:
      if (
        [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        ].includes(statusHistory[statusHistory.length - 1].status)
      ) {
        throw new ValidationError({
          message: 'Item cannot be cancelled once packed.',
          params: { statusHistory, updatedStatus },
          report: false,
          where: `${__filename} - _isStatusChangeValid`,
        });
      }
      return true;
    case OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED:
      if (
        [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
        ].includes(statusHistory[statusHistory.length - 1].status) &&
        statusHistory.findIndex(
          (history) => history.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        ) < 0
      ) {
        throw new ValidationError({
          message: 'Item cannot be closed when in transit.',
          params: { statusHistory, updatedStatus },
          report: false,
          where: `${__filename} - _isStatusChangeValid`,
        });
      }
      return true;
    default:
      throw new ValidationError({
        message: `Invalid status ${updatedStatus} received.`,
        params: { statusHistory, updatedStatus },
        where: `${__filename} - _isStatusChangeValid`,
      });
  }
}

export const validateCreateOrderRequestItemsInput = (
  createOrderRequestItemsInput: Array<OrderRequestItemEntity.CreateOrderRequestItemInput>,
): void => {
  createOrderRequestItemsInput.forEach((item) => {
    const { cost, projectId, categoryId, quantity } = item;
    if (!item.title && !item.sku && !item.upcCode && !item.website && !item.description && !item.imageUrl) {
      throw new ValidationError({
        debugMessage: 'No title/sku/upcCode/website/description/image provided.',
        message: 'Item without any title/sku/upc-code/website/description/image provided.',
        params: { item },
        where: `${__filename} - ${validateCreateOrderRequestItemsInput.name}`,
      });
    }
    if (projectId && !isValidObjectId(projectId)) {
      throw new ValidationError({
        debugMessage: 'Invalid projectId in order items!',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { projectId },
        where: `${__filename} - ${validateCreateOrderRequestItemsInput.name}`,
      });
    }
    if (categoryId && !isValidObjectId(categoryId)) {
      throw new ValidationError({
        debugMessage: 'Invalid categoryId in order items!',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { categoryId },
        where: `${__filename} - ${validateCreateOrderRequestItemsInput.name}`,
      });
    }
    if (cost && Number.isNaN(Number(cost))) {
      throw new ValidationError({
        debugMessage: 'Invalid cost in order items!',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { cost },
        where: `${__filename} - ${validateCreateOrderRequestItemsInput.name}`,
      });
    }
    if (!quantity || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw new ValidationError({
        debugMessage: 'Invalid/Missing quantity in order items!',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { quantity },
        where: `${__filename} - ${validateCreateOrderRequestItemsInput.name}`,
      });
    }
  });
};

export const validateCloseOrderRequestItemsInput = (
  existingOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
) => {
  if (
    !existingOrderRequestItems.some(({ status }) =>
      [
        OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
      ].includes(status),
    )
  ) {
    throw new ValidationError({
      debugMessage: 'Items in order request are incomplete state to close the order.',
      message: 'Items in order request are incomplete state to close the order.',
      params: { existingOrderRequestItems },
      where: `${__filename} - ${validateCloseOrderRequestItemsInput.name}`,
    });
  }
};

export const validateDeleteOrderRequestItems = (
  existingOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
): void => {
  /* Check whether any item is already in process or has been processed. */
  const isAnyItemPicked = existingOrderRequestItems.some(
    (item) =>
      [
        OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
      ].includes(item.status) ||
      item.statusHistory.some((statusHistory) =>
        [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        ].includes(statusHistory.status),
      ),
  );
  if (isAnyItemPicked) {
    logger.debug({
      existingOrderRequestItems,
      message: `One or more items of order is already picked and packed.`,
    });
    throw new ValidationError({
      message: 'This order request item is in the delivery process and cannot be deleted.',
      params: { existingOrderRequestItems },
      report: false,
      where: `${__filename} - ${validateDeleteOrderRequestItems.name}`,
    });
  }
};

export const validateReturnOrderRequestItemsInput = (
  returnOrderRequestItemsInput: OrderRequestItemEntity.ReturnOrderRequestItemsInput,
  correspondingOrderRequest: OrderRequestEntity.OrderRequestSchema,
  eligibleOrderRequestItemsForReturn: OrderRequestItemEntity.OrderRequestItemSchema[],
  userContext: UserContext,
): void => {
  const { orderRequestId, returnedOrderRequestItems = [] } = returnOrderRequestItemsInput;
  if (correspondingOrderRequest.childTenantId || correspondingOrderRequest.parentTenantId) {
    throw new ValidationError({
      debugMessage: 'You are not authorized to return this order. Please contact an administrator for assistance.',
      message: 'You are not authorized to return this order. Please contact an administrator for assistance.',
      params: { returnOrderRequestItemsInput, orderRequestId },
      where: `${__filename} - validateReturnOrderRequestItemsInput`,
    });
  }

  if (!orderRequestId || !isValidObjectId(orderRequestId)) {
    throw new ValidationError({
      debugMessage: 'Invalid Order Request Id provided!',
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      params: { returnOrderRequestItemsInput, orderRequestId },
      where: `${__filename} - validateReturnOrderRequestItemsInput`,
    });
  }
  if (returnedOrderRequestItems.length === 0) {
    logger.error({ message: `Provided returnedOrderRequestItems length is 0` });
    throw new ValidationError({
      debugMessage: 'No items found in return request',
      message: 'Please select at least one orderRequestItem to return.',
      params: { returnOrderRequestItemsInput, returnedOrderRequestItems },
      where: `${__filename} - validateReturnOrderRequestItemsInput`,
    });
  }

  returnedOrderRequestItems.forEach(({ _id, quantity }) => {
    if (!_id || !isValidObjectId(_id)) {
      logger.error({ message: `Provided orderRequestItemId ${_id} is not valid` });
      throw new ValidationError({
        debugMessage: 'Invalid orderRequestItem _id found.',
        message: 'Order request item could not be returned right now. Please try again later.',
        params: { returnOrderRequestItemsInput, _id },
        where: `${__filename} - validateReturnOrderRequestItemsInput`,
      });
    }
    if (Number.isNaN(quantity) || Number(quantity) <= 0) {
      logger.error({ message: `Provided quantity for orderRequestItemId ${_id} is ${quantity}` });
      throw new ValidationError({
        debugMessage: 'Invalid quantity found.',
        message: 'Please enter a number greater than zero to proceed.',
        params: { returnOrderRequestItemsInput, _id, quantity },
        where: `${__filename} - validateReturnOrderRequestItemsInput`,
      });
    }
  });

  if (!correspondingOrderRequest) {
    throw new ForbiddenError({
      debugMessage: 'Unavailable/Inaccessible order request tried to return.',
      message: 'This order is not available. Please recheck the order or select a different order.',
      params: { returnOrderRequestItemsInput, correspondingOrderRequest },
      where: 'OrderRequestService - validateReturnOrderRequestItemsInput',
    });
  }
  if (correspondingOrderRequest.status === OrderRequestEntity.OrderRequestStatusEnum.CLOSED) {
    throw new ResourceNotFoundError({
      debugMessage: 'Order to return is closed.',
      message: 'This order request is closed. Hence, it is not permitted to return items of this order request.',
      params: { returnOrderRequestItemsInput, correspondingOrderRequest },
      report: false,
      where: 'orderRequestValidator - validateReturnOrderRequestItemsInput',
    });
  }

  /* Checking whether all itemIds in return request payload is returnable or not */
  if (
    returnedOrderRequestItems.some(({ _id }) =>
      eligibleOrderRequestItemsForReturn.every((orderRequestItem) => orderRequestItem._id.toString() !== _id.toString()),
    )
  ) {
    throw new ValidationError({
      debugMessage: 'Unreturnable items requested to return.',
      message: 'One or more items in the return request is not valid. Please refresh and retry.',
      params: { returnOrderRequestItemsInput, eligibleOrderRequestItemsForReturn },
      where: `${__filename} - validateReturnOrderRequestItemsInput`,
    });
  }
};

export const validateUpdateOrderRequestItemsInput = (
  existingOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  { updates }: OrderRequestEntity.UpdateOrderRequestInput,
): void => {
  const { items: orderRequestItems } = updates;

  orderRequestItems.forEach(({ _id, cost, quantity }) => {
    if (cost < 0 || (cost && Number.isNaN(Number(cost)))) {
      logger.debug({ message: `Provided cost ${cost} of item ${_id} is invalid.` });
      throw new ValidationError({
        debugMessage: 'Invalid cost of an item provided.',
        message: 'Please enter a number greater than zero for cost to proceed.',
        params: { existingOrderRequestItems, updates, _id, cost },
        where: `${__filename} - validateUpdateOrderRequestItemsInput`,
      });
    }
    if ((quantity && Number.isNaN(Number(quantity))) || quantity <= 0) {
      logger.debug({ message: `Provided quantity ${quantity} of item ${_id} is invalid.` });
      throw new ValidationError({
        debugMessage: 'Invalid quantity of an item provided.',
        message: 'Please enter a number greater than zero for quantity to proceed.',
        params: { existingOrderRequestItems, updates, _id, quantity },
        where: `${__filename} - validateUpdateOrderRequestItemsInput`,
      });
    }
  });
  const existingOrderRequestItemsById = keyBy(existingOrderRequestItems, (element) => element._id.toString());
  /** isEdited will only come from the request through edit order flow. All the internal function calls won't have isEdited flag. */
  if (
    orderRequestItems.some(
      ({ _id, isEdited, status }) =>
        isEdited &&
        ![
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
        ].includes(existingOrderRequestItemsById[_id.toString()].status) &&
        ![
          OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
        ].includes(status),
    )
  ) {
    throw new ValidationError({
      debugMessage: 'In-process item requested to be updated.',
      message: 'The item is in process and cannot be modified. Please retry your request.',
      params: { existingOrderRequestItems, updates },
      where: `${__filename} - validateUpdateOrderRequestItemsInput`,
    });
  }
  /**
   *  OR-604 requested this validation to be disabled.
   *
  if (
    orderRequestItems.some(
      ({ _id, isEdited, status }) => isEdited && existingOrderRequestItemsById[_id.toString()].status !== status,
    )
  ) {
    throw new InvalidDataException('Cannot update status of an item through edit order.');
  }
  **/
};

export const validateResendReturnedOrderRequestItemEmail = async (
  orderRequestItem: OrderRequestItemEntity.OrderRequestItemSchema | undefined,
): Promise<void> => {
  if (!orderRequestItem) {
    throw new ResourceNotFoundError({
      debugMessage: 'Invalid order request item return mail requested.',
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      params: { orderRequestItem },
      where: `${__filename} - validateResendReturnedOrderRequestItemEmail`,
    });
  }
  if (!orderRequestItem.parentOrderRequestItemId) {
    throw new ResourceNotFoundError({
      debugMessage: 'Order Item not in return process.',
      message: 'This item is not in the process of being returned. Please click on "Return Item" to start a return.',
      params: { orderRequestItem },
      where: `${__filename} - validateResendReturnedOrderRequestItemEmail`,
    });
  }
  if (orderRequestItem.status !== OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED) {
    throw new ResourceNotFoundError({
      debugMessage: 'This Order Item has already left for the origin facility.',
      message:
        'This Item has not been delivered. Once the item has been delivered, please click on "Return Item" to start a return.',
      params: { orderRequestItem },
      where: `${__filename} - validateResendReturnedOrderRequestItemEmail`,
    });
  }
};

export const validateUnpackOrderRequestItemsOfTrackingIds = (
  { trackingIds }: OrderRequestItemEntity.UnpackOrderRequestItemsOfTrackingIdsInput,
  orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
): void => {
  for (const orderRequestItem of orderRequestItems) {
    const { status, trackingDetails } = orderRequestItem;
    if (status !== OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED) {
      throw new ValidationError({
        debugMessage: 'Already in delivery process order requested to be unpacked.',
        message: 'This container is in the delivery process and not available to be unpacked.',
        params: { orderRequestItems, orderRequestItem },
        where: `${__filename} - validateUnpackOrderRequestItemsOfTrackingIds`,
      });
    }
    const correspondingTrackingDetails = trackingDetails.filter(({ trackingId }) => trackingIds.includes(trackingId));
    if (
      correspondingTrackingDetails.some(
        ({ status: trackingStatus }) => trackingStatus !== ShippingTransactionEntity.ShippingTransactionStatusEnum.PACKED,
      )
    ) {
      throw new ValidationError({
        debugMessage: 'Already in delivery process order requested to be unpacked.',
        message: 'This container is in the delivery process and not available to be unpacked.',
        params: { orderRequestItems, orderRequestItem, correspondingTrackingDetails },
        where: `${__filename} - validateUnpackOrderRequestItemsOfTrackingIds`,
      });
    }
  }
};

export const validateUpdateOrderRequestItemStatusByOrderRequestId = (
  existingOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  updateOrderRequestItemStatusByOrderRequestIdInput: OrderRequestItemEntity.UpdateOrderRequestItemStatusByOrderRequestIdInput,
): void => {
  const { orderRequestItemId, status: updatedStatus } = updateOrderRequestItemStatusByOrderRequestIdInput;
  const orderRequestItemToUpdate = existingOrderRequestItems.find((item) => item._id.toString() === orderRequestItemId);

  if (!orderRequestItemToUpdate) {
    throw new ResourceNotFoundError({
      debugMessage: 'Order request item could not be found under this order.',
      message: 'This item does not exist in this order.',
      params: { existingOrderRequestItems, updateOrderRequestItemStatusByOrderRequestIdInput },
      where: `${__filename} - validateUpdateOrderRequestItemStatusByOrderRequestId`,
    });
  }

  const { status: currentStatus, statusHistory } = orderRequestItemToUpdate;

  if (orderRequestItemToUpdate.status === updatedStatus) {
    logger.warn({ message: 'Nothing to update in orderRequestItem' });
    throw new ValidationError({
      where: `${__filename} validateUpdateOrderRequestItemStatusByOrderRequestId`,
      httpStatus: StatusCodes.OK,
      report: false,
      params: updateOrderRequestItemStatusByOrderRequestIdInput,
      message: `The item is already in ${updatedStatus} status`,
    });
  }

  if (!OrderRequestItemValidStatusSequence.includes(updatedStatus)) {
    throw new ValidationError({
      debugMessage: 'Invalid item status provided to update.',
      message: 'Please select a valid item status to update.',
      params: {
        updateOrderRequestItemStatusByOrderRequestIdInput,
        orderRequestItemToUpdate,
        currentStatus,
        updatedStatus,
      },
      where: `${__filename} - validateUpdateOrderRequestItemStatusByOrderRequestId`,
    });
  }
  if (
    OrderRequestItemValidStatusSequence.lastIndexOf(updatedStatus) <
    OrderRequestItemValidStatusSequence.indexOf(currentStatus)
  ) {
    throw new ValidationError({
      debugMessage: 'In process item requested to update.',
      message: 'This order is in process and cannot be modified. Please retry your request.',
      params: {
        updateOrderRequestItemStatusByOrderRequestIdInput,
        orderRequestItemToUpdate,
        currentStatus,
        updatedStatus,
      },
      where: `${__filename} - validateUpdateOrderRequestItemStatusByOrderRequestId`,
    });
  }
  _isStatusChangeValid(statusHistory, updatedStatus);
};
