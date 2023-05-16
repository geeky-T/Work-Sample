import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import mongoose, { FilterQuery } from 'mongoose';

export function buildGetOrderRequestItemsFilterQuery(
  orderRequestItemsFilters: OrderRequestItemEntity.OrderRequestItemFilters,
): FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> {
  const query: FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> = {};
  for (const key of Object.keys(orderRequestItemsFilters) as Array<keyof OrderRequestItemEntity.OrderRequestItemFilters>) {
    if (orderRequestItemsFilters[key] && Array.isArray(orderRequestItemsFilters[key])) {
      if ((orderRequestItemsFilters[key] as any[]).length === 0) {
        continue;
      }
    }
    switch (key) {
      case '_and': {
        if (orderRequestItemsFilters._and && Array.isArray(orderRequestItemsFilters._and)) {
          query.$and = query.$and || [];
          for (const andCondition of orderRequestItemsFilters._and) {
            const nestedQuery = buildGetOrderRequestItemsFilterQuery(andCondition);
            if (Object.keys(nestedQuery).length !== 0) {
              query.$and.push(nestedQuery);
            }
          }
          if (query.$and && Array.isArray(query.$and) && query.$and.length === 0) {
            delete query.$and;
          }
        }
        break;
      }
      case '_or': {
        if (orderRequestItemsFilters._or && Array.isArray(orderRequestItemsFilters._or)) {
          query.$or = query.$or || [];
          for (const orCondition of orderRequestItemsFilters._or) {
            const nestedQuery = buildGetOrderRequestItemsFilterQuery(orCondition);
            if (Object.keys(nestedQuery).length !== 0) {
              query.$or.push(nestedQuery);
            }
          }
          if (query.$or && Array.isArray(query.$or) && query.$or.length === 0) {
            delete query.$or;
          }
        }
        break;
      }
      case '_exists': {
        if (orderRequestItemsFilters._exists) {
          query.$and = query.$and || [];
          for (const existsKey in orderRequestItemsFilters._exists) {
            query.$and.push({
              [existsKey]: {
                $exists: orderRequestItemsFilters._exists[existsKey as keyof OrderRequestItemEntity.OrderRequestItemSchema],
              },
            });
          }
        }
        break;
      }
      case 'categoryIds': {
        query.categoryId = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'orderRequestIds': {
        query.orderRequestId = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'orderRequestItemIds': {
        query._id = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'entityIdsInSourceTenant': {
        const { entityIdsInSourceTenant } = orderRequestItemsFilters;
        if (entityIdsInSourceTenant && entityIdsInSourceTenant.length > 0) {
          query['entityIdInSourceTenant'] = {
            $in: entityIdsInSourceTenant.map(
              (entityIdInSourceTenant) => new mongoose.Types.ObjectId(entityIdInSourceTenant),
            ),
          };
        }
        break;
      }
      case 'projectIds': {
        query.projectId = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'itemIds': {
        query.itemId = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'skus': {
        query.sku = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'statuses': {
        query.status = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'trackingIds': {
        query['trackingDetails.trackingId'] = { $in: orderRequestItemsFilters[key] };
        break;
      }
      case 'trackingIdsInParentTenant': {
        query['transactionDetails.trackingIdInPartnerTenant'] = {
          $in: orderRequestItemsFilters[key],
        };
        break;
      }
      case 'types': {
        query.type = { $in: orderRequestItemsFilters[key] };
        break;
      }
      default:
        continue;
    }
  }
  logger.debug({ message: 'Query for fetching orderRequestItem(s)', payload: { query } });
  return query;
}
