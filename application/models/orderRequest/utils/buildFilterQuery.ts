import { logger } from '@procurenetworks/backend-utils';
import {
  Entity,
  LocationEntity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  StringObjectID,
  UserContext,
  UserEntity,
} from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import { escapeRegExp } from 'lodash';
import mongoose, { FilterQuery } from 'mongoose';
import { DepartmentService, LocationService, UserService } from '../../../transport/__grpc/client/services';

async function searchExternalEntities(search: string, userContext: UserContext) {
  const promises = [
    UserService.getPaginatedUsers(
      {
        filters: {
          searchInternal: search,
          statuses: [
            UserEntity.UserStatusEnum.ACTIVE,
            UserEntity.UserStatusEnum.DELETED,
            UserEntity.UserStatusEnum.INACTIVE,
          ],
        },
        paginationProps: { limit: 10000 },
        projection: { _id: 1 },
      },
      userContext,
    ),
    LocationService.getPaginatedLocations(
      {
        filters: {
          searchInternal: search,
          types: [LocationEntity.LocationTypeEnum.SITE, LocationEntity.LocationTypeEnum.PARTNER_TENANT],
        },
        paginationProps: { limit: 10000 },
        projection: { _id: 1 },
      },
      userContext,
    ),
    DepartmentService.getPaginatedDepartments(
      {
        filters: { searchInternal: search },
        paginationProps: { limit: 10000 },
        projection: { _id: 1 },
      },
      userContext,
    ),
  ];
  const [paginatedUsers, paginatedSites, paginatedDepartments] = await Promise.all(promises);
  const userIds: StringObjectID[] = paginatedUsers.edges.map(({ node }) => new mongoose.Types.ObjectId(node._id));
  const siteIds: StringObjectID[] = paginatedSites.edges.map(({ node }) => new mongoose.Types.ObjectId(node._id));
  const departmentIds: StringObjectID[] = paginatedDepartments.edges.map(
    ({ node }) => new mongoose.Types.ObjectId(node._id),
  );
  return { departmentIds, siteIds, userIds };
}

export async function buildGetOrderRequestsFilterQuery(
  orderRequestsFilters: OrderRequestEntity.OrderRequestFilters,
  userContext: UserContext,
): Promise<FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>>> {
  const query: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
  for (const key of Object.keys(orderRequestsFilters) as Array<keyof OrderRequestEntity.OrderRequestFilters>) {
    if (orderRequestsFilters[key] && Array.isArray(orderRequestsFilters[key])) {
      if ((orderRequestsFilters[key] as any[]).length === 0) {
        continue;
      }
    }
    switch (key) {
      case '_and': {
        if (orderRequestsFilters._and && Array.isArray(orderRequestsFilters._and)) {
          query.$and = query.$and || [];
          for (const andCondition of orderRequestsFilters._and) {
            const nestedQuery = await buildGetOrderRequestsFilterQuery(andCondition, userContext);
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
        if (orderRequestsFilters._or && Array.isArray(orderRequestsFilters._or)) {
          query.$or = query.$or || [];
          for (const orCondition of orderRequestsFilters._or) {
            const nestedQuery = await buildGetOrderRequestsFilterQuery(orCondition, userContext);
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
        if (orderRequestsFilters._exists) {
          query.$and = query.$and || [];
          for (const existsKey in orderRequestsFilters._exists) {
            query.$and.push({
              [existsKey]: {
                $exists: orderRequestsFilters._exists[existsKey as keyof OrderRequestEntity.OrderRequestSchema],
              },
            });
          }
        }
        break;
      }
      case 'search': {
        const search = orderRequestsFilters[key] as string;
        if (search === '') {
          continue;
        }
        const { userIds, siteIds, departmentIds } = await searchExternalEntities(search, userContext);
        query.$or = query.$or || [];
        query.$or = query.$or.concat([
          { orderRequestCode: { $regex: new RegExp(`.*${escapeRegExp(search.trim())}.*`, 'i') } },
          { searchTerms: { $regex: new RegExp(`.*${escapeRegExp(search.trim())}.*`, 'i') } },
          { deliverToId: { $in: userIds.map((userId) => new mongoose.Types.ObjectId(userId)) } },
          { createdById: { $in: userIds.map((userId) => new mongoose.Types.ObjectId(userId)) } },
          { billToSiteId: { $in: siteIds.map((siteId) => new mongoose.Types.ObjectId(siteId)) } },
          {
            destinationSiteId: {
              $in: siteIds.map((siteId) => new mongoose.Types.ObjectId(siteId)),
            },
          },
          {
            departmentId: {
              $in: departmentIds.map((departmentId) => new mongoose.Types.ObjectId(departmentId)),
            },
          },
          { status: { $regex: new RegExp(`^${escapeRegExp(search.trim())}`, 'i') } },
        ]);
        break;
      }
      case 'availableAtSiteIds': {
        const { availableAtSiteIds } = orderRequestsFilters;
        if (availableAtSiteIds && availableAtSiteIds.length > 0) {
          query.availableAtSiteIds = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'billToSiteIds': {
        const { billToSiteIds } = orderRequestsFilters;
        if (billToSiteIds && billToSiteIds.length > 0) {
          query.billToSiteId = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'createdById': {
        query.createdById = { $eq: orderRequestsFilters[key] };
        break;
      }
      case 'createdByIds': {
        const { createdByIds } = orderRequestsFilters;
        if (createdByIds && createdByIds.length > 0) {
          query.createdById = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'deliverToId': {
        query.deliverToId = { $eq: orderRequestsFilters[key] };
        break;
      }
      case 'deliverToIds': {
        const { deliverToIds } = orderRequestsFilters;
        if (deliverToIds && deliverToIds.length > 0) {
          query.deliverToId = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'leastItemStatuses': {
        const { leastItemStatuses } = orderRequestsFilters;
        if (leastItemStatuses && leastItemStatuses.length > 0) {
          query.leastItemStatus = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'statuses': {
        const { statuses } = orderRequestsFilters;
        if (statuses && statuses.length > 0) {
          query.status = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'destinationSiteIds': {
        const { destinationSiteIds } = orderRequestsFilters;
        if (destinationSiteIds && destinationSiteIds.length > 0) {
          query.destinationSiteId = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'orderRequestIds': {
        const { orderRequestIds } = orderRequestsFilters;
        if (orderRequestIds && orderRequestIds.length > 0) {
          query._id = { $in: orderRequestsFilters[key] };
        }
        break;
      }
      case 'entityIdsInSourceTenant': {
        const { entityIdsInSourceTenant } = orderRequestsFilters;
        if (entityIdsInSourceTenant && entityIdsInSourceTenant.length > 0) {
          query['entityIdInSourceTenant'] = {
            $in: entityIdsInSourceTenant.map(
              (entityIdInSourceTenant) => new mongoose.Types.ObjectId(entityIdInSourceTenant),
            ),
          };
        }
        break;
      }
      case 'entitySources': {
        const { entitySources } = orderRequestsFilters;
        if (entitySources && entitySources.length > 0) {
          query['entitySource'] = { $in: entitySources };
        }
        break;
      }
      case 'pickableOrders': {
        query.leastItemStatus = {
          $in: [OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN],
        };
        /** Order request with entitySource: internal are order request in parent tenant or current tenant. */
        query.entitySource = { $in: [Entity.EntitySourceEnum.INTERNAL] };
        break;
      }
      default:
        continue;
    }
  }
  logger.debug({ message: 'Query for fetching orderRequest(s)', payload: { query } });
  return query;
}
