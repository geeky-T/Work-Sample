import {
  getRPCMetadata,
  PingResponse,
  RPCOrganizationServiceClient,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { Metadata } from 'grpc';
import { v4 as uuidv4 } from 'uuid';
import { appConfigs } from '../../../../../appConfigs/index';

const { serviceRPCCall: OrganizationServiceRPCCall } = RPCOrganizationServiceClient.getClient({
  host: appConfigs.rpc.organizationService.host,
  port: appConfigs.rpc.organizationService.port,
});

export class OrganizationServiceRPCClient {
  static rpcCall =
    <T1, R>(fnName: string) =>
    (input: T1, userContext: UserContext): Promise<R> => {
      const metadata = getRPCMetadata(userContext);
      return OrganizationServiceRPCCall<T1, R>(fnName)(input, metadata);
    };

  static pingService = (): Promise<PingResponse> => {
    const metadata = new Metadata();
    // metadata.set('requestId', 'pingService');

    metadata.set('requestId', uuidv4());
    return OrganizationServiceRPCCall<any, PingResponse>('ping')({}, metadata);
  };
}
