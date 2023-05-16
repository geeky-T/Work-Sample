import { logger } from '@procurenetworks/backend-utils';
import { PartnerTenantEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class PartnerTenantService extends OrganizationServiceRPCClient {
  /* Queries */
  static async getAllPartnerTenants(
    input: PartnerTenantEntity.GetAllPartnerTenantsInput,
    userContext: UserContext,
  ): Promise<PartnerTenantEntity.GetAllPartnerTenantsPayload> {
    logger.debug({ message: 'PartnerTenant Service. getAllPartnerTenants', payload: { input } });
    const payload = await this.rpcCall<
      PartnerTenantEntity.GetAllPartnerTenantsInput,
      PartnerTenantEntity.GetAllPartnerTenantsPayload
    >('getAllPartnerTenants')(input, userContext);
    return payload;
  }

  static async getPaginatedPartnerTenants(
    input: PartnerTenantEntity.GetPaginatedPartnerTenantsInput,
    userContext: UserContext,
  ): Promise<PartnerTenantEntity.PaginatedPartnerTenantsPayload> {
    logger.debug({
      message: 'PartnerTenant Service. getPaginatedPartnerTenants',
      payload: { input },
    });
    const payload = await this.rpcCall<
      PartnerTenantEntity.GetPaginatedPartnerTenantsInput,
      PartnerTenantEntity.PaginatedPartnerTenantsPayload
    >('getPaginatedPartnerTenants')(input, userContext);
    return payload;
  }
}
