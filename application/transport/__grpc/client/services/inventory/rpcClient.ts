import {
  getRPCMetadata,
  PingResponse,
  RPCInventoryServiceClient,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { Metadata } from 'grpc';
import { v4 as uuidv4 } from 'uuid';
import { appConfigs } from '../../../../../appConfigs/index';

const { serviceRPCCall: InventoryServiceRPCCall } = RPCInventoryServiceClient.getClient({
  host: appConfigs.rpc.inventoryService.host,
  port: appConfigs.rpc.inventoryService.port,
});

export class InventoryServiceRPCClient {
  static rpcCall =
    <T1, R>(fnName: string) =>
    (input: T1, userContext: UserContext): Promise<R> => {
      const metadata = getRPCMetadata(userContext);
      return InventoryServiceRPCCall<T1, R>(fnName)(input, metadata);
    };

  static pingService = (): Promise<PingResponse> => {
    const metadata = new Metadata();
    // metadata.set('requestId', 'pingService');

    metadata.set('requestId', uuidv4());
    return InventoryServiceRPCCall<any, PingResponse>('ping')({}, metadata);
  };
}
