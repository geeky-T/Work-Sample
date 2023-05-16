import { ForbiddenError, logger, ResourceNotFoundError, ValidationError } from '@procurenetworks/backend-utils';
import {
  OrderRequestEntity,
  OrderRequestItemEntity,
  PickListEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { isOrderRequestBlockedByOtherUser } from '@utils/orderRequestBlockedStatus.util';
import { isValidObjectId } from 'mongoose';

export const validateCreatePickList = async (
  orderRequest: OrderRequestEntity.OrderRequestSchema,
  pickableOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
  createPickListInput: PickListEntity.CreatePickListInput,
  userContext: UserContext,
): Promise<void> => {
  if (!orderRequest) {
    throw new ForbiddenError({
      debugMessage: 'Unavailable/Inaccessible order request tried to pick.',
      message: 'This order is not available. Please recheck the order or select a different order.',
      params: { orderRequest, pickableOrderRequestItems, createPickListInput },
      where: `${__filename} - ${validateCreatePickList.name}`,
    });
  } else if (isOrderRequestBlockedByOtherUser(orderRequest, userContext.currentUserInfo._id)) {
    throw new ResourceNotFoundError({
      where: `${__filename} validateCreatePickList`,
      report: false,
      message: 'This order is in process. Please try again later.',
    });
  }

  if (pickableOrderRequestItems.length === 0) {
    throw new ValidationError({
      debugMessage: 'Pick List has already been completed.',
      message: 'This pick list has already been completed. Please select another order request.',
      params: { orderRequest, pickableOrderRequestItems, createPickListInput },
      where: `${__filename} - ${validateCreatePickList.name}`,
    });
  }

  if (createPickListInput.items.length === 0) {
    throw new ValidationError({
      debugMessage: 'Please pick at least one item to create a pick list.',
      message: 'Please pick at least one item to create a pick list.',
      params: { orderRequest, pickableOrderRequestItems, createPickListInput },
      where: `${__filename} - ${validateCreatePickList.name}`,
    });
  }
  const quantityPickedByItemId: Record<string, number> = {};
  for (const pickListItem of createPickListInput.items) {
    if (!isValidObjectId(pickListItem._id)) {
      throw new ValidationError({
        debugMessage: 'Invalid item id provided.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequest, pickableOrderRequestItems, createPickListInput, pickListItem },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    if (Number.isNaN(Number(pickListItem.cost))) {
      throw new ValidationError({
        debugMessage: 'Invalid cost value in item, it must be a valid number.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequest, pickableOrderRequestItems, createPickListInput, pickListItem },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    if (!pickListItem.locationId || (pickListItem.locationId && !isValidObjectId(pickListItem.locationId))) {
      throw new ValidationError({
        debugMessage: 'Invalid locationId found in picked item.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequest, pickableOrderRequestItems, createPickListInput, pickListItem },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    const orderRequestItem = pickableOrderRequestItems.find((item) => item._id.toString() === pickListItem._id.toString());

    if (!orderRequestItem) {
      logger.error({
        message: `Item with SKU ${pickListItem.sku} is not available in pickable items list`,
        pickableOrderRequestItems,
      });
      throw new ResourceNotFoundError({
        debugMessage: 'One of the item picked and packed is not available.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequest, pickableOrderRequestItems, createPickListInput, pickListItem },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    if (orderRequestItem.sku !== pickListItem.sku) {
      throw new ValidationError({
        debugMessage: 'Mismatched order item details.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: {
          orderRequest,
          pickableOrderRequestItems,
          createPickListInput,
          orderRequestItem,
          pickListItem,
        },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    pickListItem.containers.forEach((container) => {
      quantityPickedByItemId[pickListItem._id.toString()] =
        (quantityPickedByItemId[pickListItem._id.toString()] || 0) + container.quantity;
      if (Number.isNaN(Number(container.quantity)) || container.quantity <= 0) {
        throw new ValidationError({
          debugMessage: 'Invalid quantity picked of item, it must be a valid number greater than 0.',
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          params: {
            orderRequest,
            pickableOrderRequestItems,
            createPickListInput,
            orderRequestItem,
            pickListItem,
            container,
          },
          where: `${__filename} - ${validateCreatePickList.name}`,
        });
      }
    });
  }
  Object.keys(quantityPickedByItemId).forEach((pickedOrderRequestItemId) => {
    const orderRequestItem = pickableOrderRequestItems.find(
      (orderRequestItemId) => orderRequestItemId._id.toString() === pickedOrderRequestItemId,
    );
    if (!orderRequestItem) {
      throw new ResourceNotFoundError({
        debugMessage: 'An item in this pick list is not part of this order request or has already been picked.',
        message: 'An item in this pick list is not part of this order request or has already been picked.',
        params: {
          orderRequest,
          pickableOrderRequestItems,
          createPickListInput,
          pickedOrderRequestItemId,
        },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
    if (!quantityPickedByItemId[pickedOrderRequestItemId]) {
      return;
    }
    if (quantityPickedByItemId[pickedOrderRequestItemId] > orderRequestItem.quantity) {
      throw new ValidationError({
        debugMessage: 'Quantity of item picked is greater than quantity requested.',
        message:
          'The quantity of the item picked is greater than the quantity requested. Please recheck and provide a valid quantity.',
        params: {
          orderRequest,
          pickableOrderRequestItems,
          createPickListInput,
          quantityPickedByItemId,
          pickedOrderRequestItemId,
        },
        where: `${__filename} - ${validateCreatePickList.name}`,
      });
    }
  });
};
