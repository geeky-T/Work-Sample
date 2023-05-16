import { logger } from '@procurenetworks/backend-utils';
import { Entity, ItemLocationEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class ItemLocationService extends InventoryServiceRPCClient {
  /** Queries */
  static async getAllItemLocations(
    input: ItemLocationEntity.GetAllItemLocationsInput,
    userContext: UserContext,
  ): Promise<ItemLocationEntity.GetAllItemLocationsPayload> {
    logger.debug({ message: 'ItemLocation Service: getAllItemLocations', payload: { input } });
    const payload = await this.rpcCall<
      ItemLocationEntity.GetAllItemLocationsInput,
      ItemLocationEntity.GetAllItemLocationsPayload
    >('getAllItemLocations')(input, userContext);
    return payload;
  }
  static async getPaginatedItemLocations(
    input: ItemLocationEntity.GetPaginatedItemLocationsInput,
    userContext: UserContext,
  ): Promise<ItemLocationEntity.PaginatedItemLocationsPayload> {
    logger.debug({
      message: 'ItemLocation Service: getPaginatedItemLocations',
      payload: { input },
    });
    const payload = await this.rpcCall<
      ItemLocationEntity.GetPaginatedItemLocationsInput,
      ItemLocationEntity.PaginatedItemLocationsPayload
    >('getPaginatedItemLocations')(input, userContext);
    return payload;
  }
  static async getTotalQuantityOfItems(
    input: ItemLocationEntity.GetTotalQuantityOfItemsInput,
    userContext: UserContext,
  ): Promise<ItemLocationEntity.GetTotalQuantityOfItemsPayload> {
    logger.debug({ message: 'ItemLocation Service: getTotalQuantityOfItems', payload: { input } });
    const payload = await this.rpcCall<
      ItemLocationEntity.GetTotalQuantityOfItemsInput,
      ItemLocationEntity.GetTotalQuantityOfItemsPayload
    >('getTotalQuantityOfItems')(input, userContext);
    return payload;
  }
  static async getDistinctValuesForAllItemLocation(
    input: ItemLocationEntity.GetDistinctValuesForAllItemLocationInput,
    userContext: UserContext,
  ): Promise<Entity.GetDistinctValuesForAllEntityPayload> {
    logger.debug({
      message: 'ItemLocation Service: getDistinctValuesForAllItemLocation',
      payload: { input },
    });
    const payload = await this.rpcCall<
      ItemLocationEntity.GetDistinctValuesForAllItemLocationInput,
      Entity.GetDistinctValuesForAllEntityPayload
    >('getDistinctValuesForAllItemLocation')(input, userContext);
    return payload;
  }
  /** Mutations */
  static async updateQuantityConfigurationsAtItemLocations(
    input: ItemLocationEntity.UpdateQuantityConfigurationsAtItemLocationsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({
      message: 'ItemLocation Service: updateQuantityConfigurationsAtItemLocations',
      payload: { input },
    });
    const payload = await this.rpcCall<
      ItemLocationEntity.UpdateQuantityConfigurationsAtItemLocationsInput,
      Entity.MutationResponse
    >('updateQuantityConfigurationsAtItemLocations')(input, userContext);
    return payload;
  }
}
