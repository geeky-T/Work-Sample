/* eslint-disable no-param-reassign */
import KoaRouter from '@koa/router';
import { InternalServerError, logger, ProcureError } from '@procurenetworks/backend-utils';
import { CategoryEntity, Entity, ItemEntity, LocationEntity } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, ParameterizedContext } from 'koa';
import { keyBy } from 'lodash';
import InventoryService from '../../../services/externals/InventoryService';
import { HTTPErrorResponseType } from '../../../types/HTTPErrorResponse';
import {
  InventoryItem,
  MinimalCategoryResponseType,
  MinimalDepartmentResponseType,
  MinimalProjectResponseType,
  MinimalSiteResponseType,
} from '../../../types/InventoryTypes/response';
import { CustomContextState } from '../../../types/KoaLibraryTypes';
import { ItemService } from '../../__grpc/client/services/inventory';
import {
  CategoryService,
  DepartmentService,
  LocationService,
  ProjectService,
} from '../../__grpc/client/services/organization';

const inventoryRoutes = new KoaRouter({ prefix: '/inv' });

inventoryRoutes.get(
  '/inventories',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      | {
          data: {
            data: InventoryItem[];
            limit: number;
            skip: number;
            total: number;
          };
          success: boolean;
        }
      | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    const {
      request: { query: queryParameters },
      state: { userContext },
    } = context;
    const filters: ItemEntity.ItemFilters = {
      types: [ItemEntity.ItemTypeEnum.ASSET, ItemEntity.ItemTypeEnum.INVENTORY],
      statuses: [ItemEntity.ItemStatusEnum.ACTIVE],
      pickableThroughOrderRequest: true,
    };
    const paginationProps: Entity.PaginationProps = {
      limit: 10,
      sorts: [{ sortField: 'sku', sortOrder: Entity.SortOrderEnum.ASC }],
    };
    if (queryParameters.search && typeof queryParameters.search === 'string') {
      filters.search = queryParameters.search;
    }
    if (queryParameters.category_id) {
      filters.categoryIds = (queryParameters.category_id as string).split(',');
    }
    if (queryParameters.ids) {
      filters.itemIds = (queryParameters.ids as string).split(',');
    }
    if (queryParameters.itemTypes) {
      filters.types = (queryParameters.itemTypes as string).split(',') as ItemEntity.ItemTypeEnum[];
    }
    if (queryParameters.skip && typeof queryParameters.skip === 'string') {
      paginationProps.skip = parseInt(queryParameters.skip);
    }
    if (queryParameters.limit && typeof queryParameters.limit === 'string') {
      paginationProps.limit = parseInt(queryParameters.limit);
    }
    try {
      const paginatedItemsPayload = await ItemService.getPaginatedItemsDeprecated({ filters, paginationProps }, userContext);

      const { categories } = await CategoryService.getCategoriesByIdsAcrossTenants(
        {
          filters: {
            categoryIds: paginatedItemsPayload.documents.map(({ categoryId }) => categoryId),
          },
        },
        userContext,
      );

      const categoryById = keyBy(categories, (element) => element._id.toString());

      context.body = {
        data: {
          limit: paginationProps.limit,
          skip: paginationProps.skip || 0,
          total: paginatedItemsPayload.totalDocuments,
          data: paginatedItemsPayload.documents.map((item) => ({
            id: item._id,
            inventory_code: item.sku,
            product_code: item.externalProductCodes[0]?.code,
            inventory_type: 'item',
            title: item.title,
            brand: item.brand,
            model: (item as any).mName || '',
            description: item.description,
            category: categoryById[item.categoryId.toString()]?.name || '',
            category_id: item.categoryId.toString(),
            cost: (
              Math.round(
                ((!!item.costOverride
                  ? (item.unitCost || 0) * (1 + (item.costOverride as number) / 100)
                  : item.unitCost || 0) +
                  Number.EPSILON) *
                  100,
              ) / 100
            )?.toString(),
            cost_each: (Math.round((item.unitCost || 0 + Number.EPSILON) * 100) / 100)?.toString(),
            shipping_fees:
              (
                Math.round((((item.unitCost || 0) * (item.costOverride || 0)) / 100 + Number.EPSILON) * 100) / 100
              )?.toString() || '0',
            image: item.attachments[0]?.url,
            thumbnail: item.attachments[0]?.url,
            type: 1,
            status: item.status,
          })),
        },
        success: true,
      };
    } catch (error: any) {
      logger.error({ message: 'Error in getting inventories through get proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to get inventories ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { filters, paginationProps },
        where: `${__filename} - inventories get route`,
      });
    }
  },
);

inventoryRoutes.post(
  '/inventories',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      | {
          data: {
            data: InventoryItem[];
            limit: number;
            skip: number;
            total: number;
          };
          success: boolean;
        }
      | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    const {
      request: { body: queryParameters },
      state: { userContext },
    } = context;
    const filters: ItemEntity.ItemFilters = {
      types: [ItemEntity.ItemTypeEnum.ASSET, ItemEntity.ItemTypeEnum.INVENTORY],
      statuses: [ItemEntity.ItemStatusEnum.ACTIVE],
      pickableThroughOrderRequest: true,
    };
    const paginationProps: Entity.PaginationProps = {
      limit: 10,
      sorts: [{ sortField: 'sku', sortOrder: Entity.SortOrderEnum.ASC }],
    };
    if (queryParameters.search && typeof queryParameters.search === 'string') {
      filters.search = queryParameters.search;
    }
    if (queryParameters.itemTypes && Array.isArray(queryParameters.itemTypes)) {
      filters.types = queryParameters.itemTypes as ItemEntity.ItemTypeEnum[];
    }
    if (queryParameters.category_id || queryParameters.categoryId) {
      filters.categoryIds = ((queryParameters.category_id || queryParameters.categoryId) as string).split(',');
    }
    if (queryParameters.categoryIds && Array.isArray(queryParameters.categoryIds)) {
      filters.categoryIds = queryParameters.categoryIds;
    }
    if (queryParameters.id) {
      filters.itemIds = (queryParameters.id as string).split(',');
    }
    if (queryParameters.ids && Array.isArray(queryParameters.ids)) {
      filters.itemIds = queryParameters.ids;
    }
    if (queryParameters.tenantId) {
      filters.tenantIds = [queryParameters.tenantId as string];

      /** Enforcing categoryIds from which items can be ordered. */
      if (
        queryParameters.tenantId !== userContext.tenantId.toString() &&
        (!queryParameters.categoryIds || queryParameters.categoryIds.length === 0)
      ) {
        const accessibleCategoryIds = await InventoryService.getAccessibleCategoryIdsOfPartnerTenant(
          queryParameters.tenantId,
          userContext,
        );
        if (accessibleCategoryIds.length === 0) {
          context.body = {
            data: {
              limit: paginationProps.limit,
              skip: paginationProps.skip || 0,
              total: 0,
              data: [],
            },
            success: true,
          };
          return;
        }
        filters.categoryIds = accessibleCategoryIds;
      }
    }
    if (queryParameters.statuses && Array.isArray(queryParameters.statuses)) {
      filters.statuses = queryParameters.statuses;
    }
    if (queryParameters.sorts && Array.isArray(queryParameters.sorts)) {
      paginationProps.sorts = queryParameters.sorts;
    }
    if (queryParameters.skip || queryParameters.skip === 0) {
      paginationProps.skip = parseInt(queryParameters.skip);
    }
    if (queryParameters.limit) {
      paginationProps.limit = parseInt(queryParameters.limit);
    }
    try {
      const paginatedItemsPayload = await ItemService.getPaginatedItemsDeprecated({ filters, paginationProps }, userContext);

      const { categories } = await CategoryService.getCategoriesByIdsAcrossTenants(
        {
          filters: {
            categoryIds: paginatedItemsPayload.documents.map(({ categoryId }) => categoryId),
          },
        },
        userContext,
      );

      const categoryById = keyBy(categories, (element) => element._id.toString());

      context.body = {
        data: {
          limit: paginationProps.limit,
          skip: paginationProps.skip || 0,
          total: paginatedItemsPayload.totalDocuments,
          data: paginatedItemsPayload.documents.map((item) => ({
            id: item._id,
            inventory_code: item.sku,
            product_code: item.externalProductCodes[0]?.code,
            inventory_type: 'item',
            title: item.title,
            brand: item.brand,
            model: (item as any).mName || '',
            description: item.description,
            category: categoryById[item.categoryId.toString()]?.name || '',
            category_id: item.categoryId.toString(),
            cost: (
              Math.round(
                ((!!item.costOverride
                  ? (item.unitCost || 0) * (1 + (item.costOverride as number) / 100)
                  : item.unitCost || 0) +
                  Number.EPSILON) *
                  100,
              ) / 100
            )?.toString(),
            cost_each: (Math.round((item.unitCost || 0 + Number.EPSILON) * 100) / 100)?.toString(),
            shipping_fees:
              (
                Math.round((((item.unitCost || 0) * (item.costOverride || 0)) / 100 + Number.EPSILON) * 100) / 100
              )?.toString() || '0',
            image: item.attachments[0]?.url,
            thumbnail: item.attachments[0]?.url,
            type: 1,
            status: item.status,
          })),
        },
        success: true,
      };
    } catch (error: any) {
      logger.error({ message: 'Error in getting inventories through post proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to get inventories ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { filters, paginationProps },
        where: `${__filename} - inventories post route`,
      });
    }
  },
);

inventoryRoutes.get(
  '/departments',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      MinimalDepartmentResponseType[] | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    const {
      state: { userContext },
    } = context;
    try {
      const paginatedDepartmentsPayload = await DepartmentService.getPaginatedDepartments(
        {
          filters: {},
          paginationProps: {
            limit: 10000,
            sorts: [{ sortField: 'name', sortOrder: Entity.SortOrderEnum.ASC }],
          },
        },
        userContext,
      );

      context.body = paginatedDepartmentsPayload.edges.map(({ node: department }) => ({
        id: department._id,
        name: department.name,
        department_code: department.departmentCode,
      }));
    } catch (error: any) {
      logger.error({ message: 'Error in getting departments through proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to getDepartments ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: {},
        where: `${__filename} - departments route`,
      });
    }
  },
);

inventoryRoutes.get(
  '/sites',
  async (
    context: ParameterizedContext<CustomContextState, DefaultContext, MinimalSiteResponseType[] | HTTPErrorResponseType>,
  ): Promise<void> => {
    const {
      request: { body: queryParameters },
      state: { userContext },
    } = context;
    const filters: LocationEntity.LocationFilters = {
      types: [LocationEntity.LocationTypeEnum.SITE],
    };
    if (queryParameters.search && typeof queryParameters.search === 'string') {
      filters.search = queryParameters.search;
    }
    if (queryParameters.types && Array.isArray(queryParameters.types)) {
      filters.types = queryParameters.types;
    }
    try {
      const paginatedLocationsPayload = await LocationService.getPaginatedLocations(
        {
          filters,
          paginationProps: {
            limit: 10000,
            sorts: [{ sortField: 'name', sortOrder: Entity.SortOrderEnum.ASC }],
          },
        },
        userContext,
      );

      context.body = paginatedLocationsPayload.edges.map(({ node: location }) => ({
        id: location._id,
        name: location.name,
      }));
    } catch (error: any) {
      logger.error({ message: 'Error in getting sites through proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to getSites ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: {},
        where: `${__filename} - sites route`,
      });
    }
  },
);

inventoryRoutes.get(
  '/projects',
  async (
    context: ParameterizedContext<CustomContextState, DefaultContext, MinimalProjectResponseType[] | HTTPErrorResponseType>,
  ): Promise<void> => {
    const {
      state: { userContext },
    } = context;
    try {
      const paginatedProjectsPayload = await ProjectService.getPaginatedProjects(
        {
          filters: {},
          paginationProps: {
            limit: 10000,
            sorts: [{ sortField: 'name', sortOrder: Entity.SortOrderEnum.ASC }],
          },
        },
        userContext,
      );

      context.body = paginatedProjectsPayload.edges.map(({ node: project }) => ({
        id: project._id,
        name: project.name,
      }));
    } catch (error: any) {
      logger.error({ message: 'Error in getting projects through proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to getProjects ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: {},
        where: `${__filename} - projects route`,
      });
    }
  },
);

inventoryRoutes.get(
  '/categories',
  async (
    context: ParameterizedContext<CustomContextState, DefaultContext, MinimalCategoryResponseType[] | HTTPErrorResponseType>,
  ): Promise<void> => {
    const {
      request: { body: queryParameters },
      state: { userContext },
    } = context;
    const filters: CategoryEntity.CategoryFilters = {
      entitySources: [Entity.EntitySourceEnum.INTERNAL],
    };
    if (queryParameters.search && typeof queryParameters.search === 'string') {
      filters.search = queryParameters.search;
    }
    if (queryParameters.entitySources && Array.isArray(queryParameters.entitySources)) {
      filters.entitySources = queryParameters.entitySources;
    }
    try {
      const paginatedCategoriesPayload = await CategoryService.getPaginatedCategories(
        {
          filters,
          paginationProps: {
            limit: 10000,
            sorts: [{ sortField: 'name', sortOrder: Entity.SortOrderEnum.ASC }],
          },
        },
        userContext,
      );

      context.body = paginatedCategoriesPayload.edges.map(({ node: category }) => ({
        id: category._id,
        name: category.name,
      }));
    } catch (error: any) {
      logger.error({ message: 'Error in getting categories through proxy', error });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to getCategories ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: {},
        where: `${__filename} - categories route`,
      });
    }
  },
);

export default inventoryRoutes;
