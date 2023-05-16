import { ServiceHealthCheckHandler } from '@controllers/serviceHealthCheck.controller';
import { RPCOrderRequestServiceServer } from '@procurenetworks/inter-service-contracts';
import { OrderRequestMutations, OrderRequestQueries } from '@transport/__grpc/server/rpcDeclarations/orderRequest';
import {
  OrderRequestItemMutations,
  OrderRequestItemQueries,
} from '@transport/__grpc/server/rpcDeclarations/orderRequestItem';

const ServiceHealthCheckController = new ServiceHealthCheckHandler();

const {
  addService,
  gRPCServer: OrderRequestServer,
  serviceCallHandler,
} = RPCOrderRequestServiceServer.initServer({ port: process.env.GRPC_PORT });
addService({
  ...OrderRequestMutations,
  ...OrderRequestQueries,
  ...OrderRequestItemMutations,
  ...OrderRequestItemQueries,
  genericServiceCall: serviceCallHandler(ServiceHealthCheckController.fetchOrderRequestHealthGeneric),
});

export const OrderRequestServiceServer = OrderRequestServer;
