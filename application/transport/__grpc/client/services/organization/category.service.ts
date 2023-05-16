import { logger } from '@procurenetworks/backend-utils';
import { CategoryEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class CategoryService extends OrganizationServiceRPCClient {
  /* Mutation */
  static async createCategory(
    input: CategoryEntity.CreateCategoryInput,
    userContext: UserContext,
  ): Promise<CategoryEntity.CreateCategoryPayload> {
    try {
      logger.debug({ message: 'Category Service. createCategory', payload: { input } });
      const payload = await this.rpcCall<CategoryEntity.CreateCategoryInput, CategoryEntity.CreateCategoryPayload>(
        'createCategory',
      )(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  /** Queries */
  static async getPaginatedCategories(
    input: CategoryEntity.GetPaginatedCategoriesInput,
    userContext: UserContext,
  ): Promise<CategoryEntity.PaginatedCategoriesPayload> {
    logger.debug({ message: 'Category Service. getPaginatedCategories', payload: { input } });
    const payload = await this.rpcCall<
      CategoryEntity.GetPaginatedCategoriesInput,
      CategoryEntity.PaginatedCategoriesPayload
    >('getPaginatedCategories')(input, userContext);
    return payload;
  }

  static async getAllCategories(
    input: CategoryEntity.GetAllCategoriesInput,
    userContext: UserContext,
  ): Promise<CategoryEntity.GetAllCategoriesPayload> {
    logger.debug({ message: 'Category Service. getAllCategories', payload: { input } });
    const payload = await this.rpcCall<CategoryEntity.GetAllCategoriesInput, CategoryEntity.GetAllCategoriesPayload>(
      'getAllCategories',
    )(input, userContext);
    return payload;
  }

  static async getCategoriesByIdsAcrossTenants(
    input: CategoryEntity.GetCategoriesByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<CategoryEntity.GetCategoriesByIdsAcrossTenantsPayload> {
    logger.debug({
      message: 'Category Service. getCategoriesByIdsAcrossTenants',
      payload: { input },
    });
    const payload = await this.rpcCall<
      CategoryEntity.GetCategoriesByIdsAcrossTenantsInput,
      CategoryEntity.GetCategoriesByIdsAcrossTenantsPayload
    >('getCategoriesByIdsAcrossTenants')(input, userContext);
    return payload;
  }
}
