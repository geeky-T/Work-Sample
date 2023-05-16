import { logger } from '@procurenetworks/backend-utils';
import { RoleEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class RoleService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getAllRoles(
    input: RoleEntity.GetAllRolesInput,
    userContext: UserContext,
  ): Promise<RoleEntity.GetAllRolesPayload> {
    logger.debug({ message: 'Role Service. getAllRoles', payload: { input } });
    const payload = await this.rpcCall<RoleEntity.GetAllRolesInput, RoleEntity.GetAllRolesPayload>('getAllRoles')(
      input,
      userContext,
    );
    return payload;
  }

  static async getCurrentUserWorkspacePermissions(
    userContext: UserContext,
  ): Promise<RoleEntity.getCurrentUserWorkspacePermissionsPayload> {
    logger.debug({ message: 'Role Service. getCurrentUserWorkspacePermissions' });
    const payload = await this.rpcCall<Record<string, unknown>, RoleEntity.getCurrentUserWorkspacePermissionsPayload>(
      'getCurrentUserWorkspacePermissions',
    )({}, userContext);
    return payload;
  }
}
