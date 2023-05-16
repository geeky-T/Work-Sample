import { logger } from '@procurenetworks/backend-utils';
import { UserContext, UserEntity } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class UserService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getPaginatedUsers(
    input: UserEntity.GetPaginatedUsersInput,
    userContext: UserContext,
  ): Promise<UserEntity.PaginatedUsersPayload> {
    logger.debug({ message: 'User Service. getPaginatedUsers', payload: { input } });
    const payload = await this.rpcCall<UserEntity.GetPaginatedUsersInput, UserEntity.PaginatedUsersPayload>(
      'getPaginatedUsers',
    )(input, userContext);
    return payload;
  }

  static async getAllUsers(
    input: UserEntity.GetAllUsersInput,
    userContext: UserContext,
  ): Promise<UserEntity.GetAllUsersPayload> {
    logger.debug({ message: 'User Service. getAllUsers', payload: { input } });
    const payload = await this.rpcCall<UserEntity.GetAllUsersInput, UserEntity.GetAllUsersPayload>('getAllUsers')(
      input,
      userContext,
    );
    return payload;
  }

  static async getUsersByIds(
    input: UserEntity.GetUsersByIdsInput,
    userContext: UserContext,
  ): Promise<UserEntity.GetAllUsersPayload> {
    logger.debug({ message: 'User Service. getUsersByIds', payload: { input } });
    const payload = await this.rpcCall<UserEntity.GetUsersByIdsInput, UserEntity.GetAllUsersPayload>('getUsersByIds')(
      input,
      userContext,
    );
    return payload;
  }

  static async getUsersByIdsAcrossTenants(
    input: UserEntity.GetUsersByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<UserEntity.GetUsersByIdsAcrossTenantsPayload> {
    logger.debug({ message: 'User Service. getUsersByIdsAcrossTenants', payload: { input } });
    const payload = await this.rpcCall<
      UserEntity.GetUsersByIdsAcrossTenantsInput,
      UserEntity.GetUsersByIdsAcrossTenantsPayload
    >('getUsersByIdsAcrossTenants')(input, userContext);
    return payload;
  }
}
