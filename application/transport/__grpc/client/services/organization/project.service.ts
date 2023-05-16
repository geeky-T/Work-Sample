import { logger } from '@procurenetworks/backend-utils';
import { ProjectEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class ProjectService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getAllProjects(
    input: ProjectEntity.GetAllProjectsInput,
    userContext: UserContext,
  ): Promise<ProjectEntity.GetAllProjectsPayload> {
    logger.debug({ message: 'Project Service. getAllProjects', payload: { input } });
    const payload = await this.rpcCall<ProjectEntity.GetAllProjectsInput, ProjectEntity.GetAllProjectsPayload>(
      'getAllProjects',
    )(input, userContext);
    return payload;
  }

  static async getPaginatedProjects(
    input: ProjectEntity.GetPaginatedProjectsInput,
    userContext: UserContext,
  ): Promise<ProjectEntity.PaginatedProjectsPayload> {
    logger.debug({ message: 'Project Service. getPaginatedProjects', payload: { input } });
    const payload = await this.rpcCall<ProjectEntity.GetPaginatedProjectsInput, ProjectEntity.PaginatedProjectsPayload>(
      'getPaginatedProjects',
    )(input, userContext);
    return payload;
  }

  static async getProjectsByIdsAcrossTenants(
    input: ProjectEntity.GetProjectsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<ProjectEntity.GetProjectsByIdsAcrossTenantsPayload> {
    logger.debug({ message: 'Project Service. getProjectsByIdsAcrossTenants', payload: { input } });
    const payload = await this.rpcCall<
      ProjectEntity.GetProjectsByIdsAcrossTenantsInput,
      ProjectEntity.GetProjectsByIdsAcrossTenantsPayload
    >('getProjectsByIdsAcrossTenants')(input, userContext);
    return payload;
  }
}
