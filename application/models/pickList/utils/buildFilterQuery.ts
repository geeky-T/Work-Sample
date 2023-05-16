import { logger } from '@procurenetworks/backend-utils';
import { PickListEntity } from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import { FilterQuery } from 'mongoose';

export function buildGetPickListsFilterQuery(
  pickListFilters: PickListEntity.PickListFilters,
): FilterQuery<DocumentType<PickListEntity.PickListSchema>> {
  const query: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {};
  for (const key of Object.keys(pickListFilters) as Array<keyof PickListEntity.PickListFilters>) {
    if (pickListFilters[key] && Array.isArray(pickListFilters[key])) {
      if ((pickListFilters[key] as any[]).length === 0) {
        continue;
      }
    }
    switch (key) {
      case '_and': {
        if (pickListFilters._and && Array.isArray(pickListFilters._and)) {
          query.$and = query.$and || [];
          for (const andCondition of pickListFilters._and) {
            const nestedQuery = buildGetPickListsFilterQuery(andCondition);
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
        if (pickListFilters._or && Array.isArray(pickListFilters._or)) {
          query.$or = query.$or || [];
          for (const orCondition of pickListFilters._or) {
            const nestedQuery = buildGetPickListsFilterQuery(orCondition);
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
        if (pickListFilters._exists) {
          query.$and = query.$and || [];
          for (const existsKey in pickListFilters._exists) {
            query.$and.push({
              [existsKey]: {
                $exists: pickListFilters._exists[existsKey as keyof PickListEntity.PickListSchema],
              },
            });
          }
        }
        break;
      }
      case 'orderRequestItemIds': {
        query['pickListItems.orderRequestItemId'] = { $in: pickListFilters[key] };
        break;
      }
      case 'orderRequestIds': {
        query._id = { $in: pickListFilters[key] };
        break;
      }
      default:
        continue;
    }
  }
  logger.debug({ message: 'Query for fetching pickList(s)', payload: { query } });
  return query;
}
