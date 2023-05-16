/* eslint-disable prefer-destructuring */
import { OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import mongoose, { UpdateQuery } from 'mongoose';
import { UpdateOrderRequestItemRepositoryInput } from '../../../types/OrderRequestItem';

export function buildUpdateOrderRequestItemQuery(
  updatedOrderRequestItemDetails: UpdateOrderRequestItemRepositoryInput,
  userContext: UserContext,
): UpdateQuery<OrderRequestItemEntity.OrderRequestItemSchema> {
  let toSetField: UpdateQuery<OrderRequestItemEntity.OrderRequestItemSchema> = {};
  const toUnsetField: UpdateQuery<OrderRequestItemEntity.OrderRequestItemSchema> = {};
  for (const key in updatedOrderRequestItemDetails) {
    switch (key as keyof OrderRequestItemEntity.OrderRequestItemSchema) {
      /** DO NOT ADD tenantId, orderRequestId field as case as they could corrupt data for external order request. */
      case 'permissions':
      case 'cost':
      case 'status':
      case 'quantity':
      case 'trackingHistory':
      case 'trackingDetails':
      case 'transactionDetails':
      case 'transactionHistory':
      case 'statusHistory':
      case 'type': {
        // eslint-disable-next-line prefer-destructuring
        const value = updatedOrderRequestItemDetails[key as keyof UpdateOrderRequestItemRepositoryInput];
        if (value || value === 0) {
          toSetField[key] = value;
        }
        break;
      }
      /** DO NOT ADD tenantId, orderRequestId field as case as they could corrupt data for external order request. */
      case 'itemId': {
        const value = updatedOrderRequestItemDetails[key as keyof UpdateOrderRequestItemRepositoryInput];
        if (value === undefined || value === null) {
          toUnsetField[key] = 1;
        } else if (value && mongoose.Types.ObjectId.isValid(value as string)) {
          toSetField[key] = new mongoose.Types.ObjectId(value as string);
        }
        break;
      }
      /** DO NOT ADD tenantId, orderRequestId field as case as they could corrupt data for external order request. */
      case 'categoryId':
      case 'description':
      case 'fromSiteId':
      case 'itemId':
      case 'note':
      case 'upcCode':
      case 'title':
      case 'sku':
      case 'skuInPartnerTenant':
      case 'projectId':
      case 'imageUrl':
      case 'website':
      case 'identificationHistory':
      case 'nonRemovableNotes':
      case 'parentOrderRequestItemId':
      case 'deletedAt':
      case 'deletedById': {
        // eslint-disable-next-line prefer-destructuring
        const value = updatedOrderRequestItemDetails[key as keyof UpdateOrderRequestItemRepositoryInput];
        if (value) {
          toSetField[key] = value;
        }
        if (value === undefined || value === null) {
          toUnsetField[key] = 1;
        }
        break;
      }
    }
  }

  /* set default fields */
  toSetField = {
    ...toSetField,
    updatedAt: userContext.requestTimestamp,
    updatedById: userContext.currentUserInfo._id,
  };
  return { $set: toSetField, $unset: toUnsetField };
}
