/* eslint-disable no-param-reassign */
import { MinimalUserResponseType } from '@custom-types/CoreTypes/response';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import KoaRouter from '@koa/router';
import { logger } from '@procurenetworks/backend-utils';
import CoreService from '@services/externals/CoreService';
import { DefaultContext, ParameterizedContext } from 'koa';

const coreRoutes = new KoaRouter({ prefix: '/core' });

coreRoutes.get(
  '/tenant-users',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, Array<MinimalUserResponseType>>) => {
    try {
      context.body = await CoreService.getTenantUsers(context.state.userContext);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      logger.error({ error, message: 'Error fetching tenant-users' });
      context.body = error.response.data;
      context.status = error.response.status;
    }
  },
);

export default coreRoutes;
