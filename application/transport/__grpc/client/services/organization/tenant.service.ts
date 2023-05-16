import { logger } from '@procurenetworks/backend-utils';
import { TenantEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class TenantService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getAllTenants(
    input: TenantEntity.GetAllTenantsInput,
    userContext: UserContext,
  ): Promise<TenantEntity.GetAllTenantsPayload> {
    logger.debug({ message: 'Tenant Service. getAllTenants', payload: { input } });
    const payload = await this.rpcCall<TenantEntity.GetAllTenantsInput, TenantEntity.GetAllTenantsPayload>('getAllTenants')(
      input,
      userContext,
    );
    return payload;
  }

  static async getPaginatedTenants(
    input: TenantEntity.GetPaginatedTenantsInput,
    userContext: UserContext,
  ): Promise<TenantEntity.PaginatedTenantsPayload> {
    logger.debug({ message: 'Tenant Service. getPaginatedTenants', payload: { input } });
    const payload = await this.rpcCall<TenantEntity.GetPaginatedTenantsInput, TenantEntity.PaginatedTenantsPayload>(
      'getPaginatedTenants',
    )(input, userContext);
    return payload;
  }

  static async getTenantsByIdsAcrossTenants(
    input: TenantEntity.GetTenantsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<TenantEntity.GetTenantsByIdsAcrossTenantsPayload> {
    logger.debug({ message: 'Tenant Service. getTenantsByIdsAcrossTenants', payload: { input } });
    const payload = await this.rpcCall<
      TenantEntity.GetTenantsByIdsAcrossTenantsInput,
      TenantEntity.GetTenantsByIdsAcrossTenantsPayload
    >('getTenantsByIdsAcrossTenants')(input, userContext);
    return payload;
  }
}
