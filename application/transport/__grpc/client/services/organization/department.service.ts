import { logger } from '@procurenetworks/backend-utils';
import { DepartmentEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class DepartmentService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getAllDepartments(
    input: DepartmentEntity.GetAllDepartmentsInput,
    userContext: UserContext,
  ): Promise<DepartmentEntity.GetAllDepartmentsPayload> {
    logger.debug({ message: 'Department Service. getAllDepartments', payload: { input } });
    const payload = await this.rpcCall<DepartmentEntity.GetAllDepartmentsInput, DepartmentEntity.GetAllDepartmentsPayload>(
      'getAllDepartments',
    )(input, userContext);
    return payload;
  }

  static async getPaginatedDepartments(
    input: DepartmentEntity.GetPaginatedDepartmentsInput,
    userContext: UserContext,
  ): Promise<DepartmentEntity.PaginatedDepartmentsPayload> {
    logger.debug({ message: 'Department Service. getPaginatedDepartments', payload: { input } });
    const payload = await this.rpcCall<
      DepartmentEntity.GetPaginatedDepartmentsInput,
      DepartmentEntity.PaginatedDepartmentsPayload
    >('getPaginatedDepartments')(input, userContext);
    return payload;
  }

  static async getDepartmentsByIdsAcrossTenants(
    input: DepartmentEntity.GetDepartmentsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<DepartmentEntity.GetDepartmentsByIdsAcrossTenantsPayload> {
    logger.debug({
      message: 'Department Service. getDepartmentsByIdsAcrossTenants',
      payload: { input },
    });
    const payload = await this.rpcCall<
      DepartmentEntity.GetDepartmentsByIdsAcrossTenantsInput,
      DepartmentEntity.GetDepartmentsByIdsAcrossTenantsPayload
    >('getDepartmentsByIdsAcrossTenants')(input, userContext);
    return payload;
  }
}
