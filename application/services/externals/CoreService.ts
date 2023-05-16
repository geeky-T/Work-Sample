/* eslint-disable camelcase */
import { MinimalUserResponseType } from '@custom-types/CoreTypes/response';
import { Entity, UserContext } from '@procurenetworks/inter-service-contracts';
import NodeCache from 'node-cache';
import { UserService } from '../../transport/__grpc/client/services';

class CoreService {
  #_cache: NodeCache;

  constructor() {
    this.#_cache = new NodeCache({ checkperiod: 90, stdTTL: 240 });
  }

  async getTenantUsers(userContext: UserContext): Promise<Array<MinimalUserResponseType>> {
    const { tenantId } = userContext;
    if (this.#_cache.has(`tenantUsers${tenantId.toString()}`)) {
      return this.#_cache.get(`tenantUsers${tenantId.toString()}`) as Array<MinimalUserResponseType>;
    }
    const paginatedUsers = await UserService.getPaginatedUsers(
      {
        filters: {},
        paginationProps: {
          limit: 10000,
          sorts: [
            { sortField: 'firstName', sortOrder: Entity.SortOrderEnum.ASC },
            { sortField: 'lastName', sortOrder: Entity.SortOrderEnum.ASC },
          ],
        },
      },
      userContext,
    );
    const tenantUsers = paginatedUsers.edges.map(({ node: user }) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
    }));
    this.#_cache.set(`tenantUsers${tenantId.toString()}`, tenantUsers);
    return tenantUsers;
  }
}

export default new CoreService();
