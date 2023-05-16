/* eslint-disable no-param-reassign */
import { OrderRequestEntity, OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { differenceBy } from 'lodash';
import { UpdateOrderRequestItemRepositoryInput } from '../../../types/OrderRequestItem';

const _updateIdentificationHistoryBasedOnOriginalOrderRequestItem = (
  incomingOrderRequestItem: OrderRequestItemEntity.OrderRequestItemSchema,
  originalOrderRequestItem: OrderRequestItemEntity.OrderRequestItemSchema,
  userContext: UserContext,
) => {
  const { currentUserInfo } = userContext;
  if (
    originalOrderRequestItem.type !== incomingOrderRequestItem.type &&
    incomingOrderRequestItem.type !== OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU
  ) {
    incomingOrderRequestItem.upcCode = undefined;
    incomingOrderRequestItem.website = undefined;
  } else if (incomingOrderRequestItem.type === OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU) {
    if (
      incomingOrderRequestItem.description &&
      originalOrderRequestItem.description !== incomingOrderRequestItem.description
    ) {
      incomingOrderRequestItem.imageUrl = undefined;
      incomingOrderRequestItem.upcCode = undefined;
      incomingOrderRequestItem.website = undefined;
      incomingOrderRequestItem.identificationHistory = (incomingOrderRequestItem.identificationHistory || []).concat([
        {
          createdAt: userContext.requestTimestamp,
          createdById: currentUserInfo._id,
          description: incomingOrderRequestItem.description,
        },
      ]);
    } else if (incomingOrderRequestItem.upcCode && originalOrderRequestItem.upcCode !== incomingOrderRequestItem.upcCode) {
      incomingOrderRequestItem.description = undefined;
      incomingOrderRequestItem.imageUrl = undefined;
      incomingOrderRequestItem.website = undefined;
      incomingOrderRequestItem.identificationHistory = (incomingOrderRequestItem.identificationHistory || []).concat([
        {
          createdAt: userContext.requestTimestamp,
          createdById: currentUserInfo._id,
          upcCode: incomingOrderRequestItem.upcCode,
        },
      ]);
    } else if (incomingOrderRequestItem.website && originalOrderRequestItem.website !== incomingOrderRequestItem.website) {
      incomingOrderRequestItem.description = undefined;
      incomingOrderRequestItem.imageUrl = undefined;
      incomingOrderRequestItem.upcCode = undefined;
      incomingOrderRequestItem.identificationHistory = (incomingOrderRequestItem.identificationHistory || []).concat([
        {
          createdAt: userContext.requestTimestamp,
          createdById: currentUserInfo._id,
          website: incomingOrderRequestItem.website,
        },
      ]);
    } else if (
      incomingOrderRequestItem.imageUrl &&
      originalOrderRequestItem.imageUrl !== incomingOrderRequestItem.imageUrl
    ) {
      incomingOrderRequestItem.description = undefined;
      incomingOrderRequestItem.upcCode = undefined;
      incomingOrderRequestItem.website = undefined;
      incomingOrderRequestItem.identificationHistory = (incomingOrderRequestItem.identificationHistory || []).concat([
        {
          createdAt: userContext.requestTimestamp,
          createdById: currentUserInfo._id,
          imageUrl: incomingOrderRequestItem.imageUrl,
        },
      ]);
    }
  }
};

export const parseUpdateOrderRequestItemsInput = (
  existingOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
  userContext: UserContext,
): {
  orderRequestItemsToUpdate: Array<UpdateOrderRequestItemRepositoryInput>;
  unmodifiedOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>;
} => {
  const { currentUserInfo } = userContext;
  const {
    updates: { items: incomingOrderRequestItems },
  } = updateOrderRequestInput;

  const orderRequestItemsToUpdate = incomingOrderRequestItems.reduce((results, incomingOrderRequestItem) => {
    if (!incomingOrderRequestItem.isEdited) {
      return results;
    }
    const originalOrderRequestItemObject = existingOrderRequestItems.find(
      (orderItem) => orderItem._id.toString() === incomingOrderRequestItem._id.toString(),
    );
    if (originalOrderRequestItemObject) {
      _updateIdentificationHistoryBasedOnOriginalOrderRequestItem(
        incomingOrderRequestItem,
        originalOrderRequestItemObject,
        userContext,
      );
      let { statusHistory: newStatusHistory } = originalOrderRequestItemObject;
      if (originalOrderRequestItemObject.status !== incomingOrderRequestItem.status) {
        newStatusHistory = [
          ...originalOrderRequestItemObject.statusHistory,
          {
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            status: incomingOrderRequestItem.status,
          },
        ];
      }
      return [
        ...results,
        {
          ...incomingOrderRequestItem,
          statusHistory: newStatusHistory,
          updatedAt: userContext.requestTimestamp,
          updatedById: currentUserInfo._id,
        },
      ];
    }
    return results;
  }, [] as Array<UpdateOrderRequestItemRepositoryInput>);
  const unmodifiedOrderRequestItems = differenceBy(existingOrderRequestItems, incomingOrderRequestItems, (item) =>
    item._id.toString(),
  );
  return { orderRequestItemsToUpdate, unmodifiedOrderRequestItems };
};

export const parseUpdateOrderRequestItemsInputForChildTenant = (
  existingOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>,
  updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
  userContext: UserContext,
): {
  orderRequestItemsToUpdate: Array<UpdateOrderRequestItemRepositoryInput>;
  unmodifiedOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema>;
} => {
  const { currentUserInfo } = userContext;
  const {
    updates: { items: incomingOrderRequestItems },
  } = updateOrderRequestInput;

  const orderRequestItemsToUpdate = incomingOrderRequestItems.reduce((results, incomingOrderRequestItem) => {
    if (!incomingOrderRequestItem.isEdited) {
      return results;
    }
    const originalOrderRequestItemObject = existingOrderRequestItems.find(
      (orderItem) => orderItem._id.toString() === incomingOrderRequestItem._id.toString(),
    );
    if (originalOrderRequestItemObject) {
      _updateIdentificationHistoryBasedOnOriginalOrderRequestItem(
        incomingOrderRequestItem,
        originalOrderRequestItemObject,
        userContext,
      );
      let { statusHistory: newStatusHistory } = originalOrderRequestItemObject;
      if (originalOrderRequestItemObject.status !== incomingOrderRequestItem.status) {
        newStatusHistory = [
          ...originalOrderRequestItemObject.statusHistory,
          {
            createdAt: userContext.requestTimestamp,
            createdById: currentUserInfo._id,
            status: incomingOrderRequestItem.status,
          },
        ];
      }
      return [
        ...results,
        {
          ...incomingOrderRequestItem,
          statusHistory: newStatusHistory,
          updatedAt: userContext.requestTimestamp,
          updatedById: currentUserInfo._id,
        },
      ];
    }
    return results;
  }, [] as Array<UpdateOrderRequestItemRepositoryInput>);
  const unmodifiedOrderRequestItems = differenceBy(existingOrderRequestItems, incomingOrderRequestItems, (item) =>
    item._id.toString(),
  );
  return { orderRequestItemsToUpdate, unmodifiedOrderRequestItems };
};
