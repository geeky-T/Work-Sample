/* eslint-disable prefer-destructuring */
import { OrderRequestEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { UpdateQuery } from 'mongoose';
import { UpdateOrderRequestRepositoryInput } from '../../../types/OrderRequest';

export function buildUpdateOrderRequestQuery(
  updatedOrderRequestDetails: UpdateOrderRequestRepositoryInput,
  userContext: UserContext,
): UpdateQuery<OrderRequestEntity.OrderRequestSchema> {
  let toSetField: UpdateQuery<OrderRequestEntity.OrderRequestSchema> = {};
  const toUnsetField: UpdateQuery<OrderRequestEntity.OrderRequestSchema> = {};
  for (const key in updatedOrderRequestDetails) {
    switch (key as keyof OrderRequestEntity.OrderRequestSchema) {
      case 'permissions':
      case 'destinationSiteId':
      case 'searchTerms':
      case 'dueDate':
      case 'scheduleId':
      case 'billToSiteId': {
        // eslint-disable-next-line prefer-destructuring
        const value = updatedOrderRequestDetails[key as keyof UpdateOrderRequestRepositoryInput];
        if (value) {
          toSetField[key] = value;
        }
        break;
      }
      case 'deliverToId':
      case 'departmentId':
      case 'deletedAt':
      case 'deletedById': {
        // eslint-disable-next-line prefer-destructuring
        const value = updatedOrderRequestDetails[key as keyof UpdateOrderRequestRepositoryInput];
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
