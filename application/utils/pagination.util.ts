import { Entity } from '@procurenetworks/inter-service-contracts';

class PaginationUtilsClass {
  getPaginatedEntitiesPayload<T>(
    entities: T[],
    totalCount: number,
    paginationProps: Entity.PaginationProps,
  ): Entity.GetPaginatedEntitiesPayload<T> {
    const { limit, skip = 0 } = paginationProps;
    const payload: Entity.GetPaginatedEntitiesPayload<T> = {
      currentPage: Math.ceil(skip / limit) + 1,
      documents: entities,
      hasNextPage: skip + limit < totalCount,
      hasPreviousPage: skip !== 0,
      limit,
      nextPage: Math.ceil(skip / limit) + 2,
      previousPage: Math.floor(skip / limit),
      skip,
      totalDocuments: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
    return payload;
  }
}

export const PaginationUtils = new PaginationUtilsClass();
