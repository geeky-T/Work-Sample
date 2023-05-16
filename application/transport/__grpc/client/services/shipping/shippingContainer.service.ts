import { Entity, ShippingContainerEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { ShippingServiceRPCClient } from './rpcClient';

export class ShippingContainerService extends ShippingServiceRPCClient {
  /* Queries */
  public static async getShippingContainersOfTrackingId(
    inputProps: ShippingContainerEntity.GetShippingContainersOfTrackingIdInput,
    context: UserContext,
  ): Promise<ShippingContainerEntity.GetAllShippingContainersPayload> {
    const allShippingContainerResponse = await this.rpcCall<
      ShippingContainerEntity.GetShippingContainersOfTrackingIdInput,
      ShippingContainerEntity.GetAllShippingContainersPayload
    >('getShippingContainersOfTrackingId')(inputProps, context);
    return allShippingContainerResponse;
  }

  /* Mutations */
  public static async createShippingContainers(
    inputProps: ShippingContainerEntity.CreateShippingContainersInput,
    context: UserContext,
  ): Promise<ShippingContainerEntity.CreateShippingContainersPayload> {
    const createShippingContainerResponse = await this.rpcCall<
      ShippingContainerEntity.CreateShippingContainersInput,
      ShippingContainerEntity.CreateShippingContainersPayload
    >('createShippingContainers')(inputProps, context);
    return createShippingContainerResponse;
  }

  public static async deleteShippingContainers(
    inputProps: ShippingContainerEntity.UpdateStatusOfShippingContainersInput,
    context: UserContext,
  ): Promise<Entity.MutationResponse> {
    const deleteShippingContainerResponse = await this.rpcCall<
      ShippingContainerEntity.UpdateStatusOfShippingContainersInput,
      Entity.MutationResponse
    >('deleteShippingContainers')(inputProps, context);
    return deleteShippingContainerResponse;
  }
}
