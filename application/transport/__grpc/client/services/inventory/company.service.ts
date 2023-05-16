import { logger } from '@procurenetworks/backend-utils';
import { CompanyEntity, Entity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class CompanyService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createCompany(
    input: CompanyEntity.CreateCompanyInput,
    userContext: UserContext,
  ): Promise<CompanyEntity.CreateCompanyPayload> {
    try {
      logger.debug({ message: 'Company Service: createCompany', payload: { input } });
      const payload = await this.rpcCall<CompanyEntity.CreateCompanyInput, CompanyEntity.CreateCompanyPayload>(
        'createCompany',
      )(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateCompany(
    input: CompanyEntity.UpdateCompanyInput,
    userContext: UserContext,
  ): Promise<CompanyEntity.UpdateCompanyPayload> {
    logger.debug({ message: 'Company Service: updateCompany', payload: { input } });
    const payload = await this.rpcCall<CompanyEntity.UpdateCompanyInput, CompanyEntity.UpdateCompanyPayload>(
      'updateCompany',
    )(input, userContext);
    return payload;
  }

  static async deleteCompanies(
    input: CompanyEntity.DeleteCompaniesInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'Company Service: deleteCompanies', payload: { input } });
    const payload = await this.rpcCall<CompanyEntity.DeleteCompaniesInput, Entity.MutationResponse>('deleteCompanies')(
      input,
      userContext,
    );
    return payload;
  }

  /** Queries */
  static async getAllCompanies(
    input: CompanyEntity.GetAllCompaniesInput,
    userContext: UserContext,
  ): Promise<CompanyEntity.GetAllCompaniesPayload> {
    logger.debug({ message: 'Company Service: getAllCompanies', payload: { input } });
    const payload = await this.rpcCall<CompanyEntity.GetAllCompaniesInput, CompanyEntity.GetAllCompaniesPayload>(
      'getAllCompanies',
    )(input, userContext);
    return payload;
  }

  static async getPaginatedCompanies(
    input: CompanyEntity.GetPaginatedCompaniesInput,
    userContext: UserContext,
  ): Promise<CompanyEntity.PaginatedCompaniesPayload> {
    logger.debug({ message: 'Company Service: getPaginatedCompanies', payload: { input } });
    const payload = await this.rpcCall<CompanyEntity.GetPaginatedCompaniesInput, CompanyEntity.PaginatedCompaniesPayload>(
      'getPaginatedCompanies',
    )(input, userContext);
    return payload;
  }
}
