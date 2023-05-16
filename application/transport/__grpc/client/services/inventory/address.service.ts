import { logger } from '@procurenetworks/backend-utils';
import { AddressEntity, Entity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class AddressService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createAddress(
    input: AddressEntity.CreateAddressInput,
    userContext: UserContext,
  ): Promise<AddressEntity.CreateAddressPayload> {
    try {
      logger.debug({ message: 'Address Service: createAddress', payload: { input } });
      const payload = await this.rpcCall<AddressEntity.CreateAddressInput, AddressEntity.CreateAddressPayload>(
        'createAddress',
      )(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateAddress(
    input: AddressEntity.UpdateAddressInput,
    userContext: UserContext,
  ): Promise<AddressEntity.UpdateAddressPayload> {
    logger.debug({ message: 'Address Service: updateAddress', payload: { input } });
    const payload = await this.rpcCall<AddressEntity.UpdateAddressInput, AddressEntity.UpdateAddressPayload>(
      'updateAddress',
    )(input, userContext);
    return payload;
  }

  static async deleteAddresses(
    input: AddressEntity.DeleteAddressesInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'Address Service: deleteAddresses', payload: { input } });
    const payload = await this.rpcCall<AddressEntity.DeleteAddressesInput, Entity.MutationResponse>('deleteAddresses')(
      input,
      userContext,
    );
    return payload;
  }

  /** Queries */
  static async getAllAddresses(
    input: AddressEntity.GetAllAddressesInput,
    userContext: UserContext,
  ): Promise<AddressEntity.GetAllAddressesPayload> {
    logger.debug({ message: 'Address Service: getAllAddresses', payload: { input } });
    const payload = await this.rpcCall<AddressEntity.GetAllAddressesInput, AddressEntity.GetAllAddressesPayload>(
      'getAllAddresses',
    )(input, userContext);
    return payload;
  }
  static async getPaginatedAddresses(
    input: AddressEntity.GetPaginatedAddressesInput,
    userContext: UserContext,
  ): Promise<AddressEntity.PaginatedAddressesPayload> {
    logger.debug({ message: 'Address Service: getPaginatedAddresses', payload: { input } });
    const payload = await this.rpcCall<AddressEntity.GetPaginatedAddressesInput, AddressEntity.PaginatedAddressesPayload>(
      'getPaginatedAddresses',
    )(input, userContext);
    return payload;
  }
}
