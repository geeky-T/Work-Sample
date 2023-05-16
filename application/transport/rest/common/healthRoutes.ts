/* eslint-disable no-param-reassign */
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import KoaRouter from '@koa/router';
import { PingResponse } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, Next, ParameterizedContext } from 'koa';
import { ShippingServiceRPCClient } from '../../__grpc/client/services/shipping/rpcClient';

const healthRoutes = new KoaRouter({ prefix: '/health' });

healthRoutes.get(
  '/',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, PingResponse>, next: Next) => {
    const result = await ShippingServiceRPCClient.pingService();
    context.body = result;
    context.status = 200;
    return next();
  },
);

export default healthRoutes;
