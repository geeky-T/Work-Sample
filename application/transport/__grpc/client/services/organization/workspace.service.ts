import { logger } from '@procurenetworks/backend-utils';
import { UserContext, WorkspaceEntity } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class WorkspaceService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getWorkspace(
    input: Record<string, unknown>,
    usercontext: UserContext,
  ): Promise<WorkspaceEntity.GetWorkspacePayload> {
    logger.debug({ message: 'Workspace Service. getWorkspace' });
    const payload = await this.rpcCall<Record<string, unknown>, WorkspaceEntity.GetWorkspacePayload>('getWorkspace')(
      input,
      usercontext,
    );
    return payload;
  }
}
