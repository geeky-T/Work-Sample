import { logger } from '@procurenetworks/backend-utils';
import { Entity, InventoryItemEntity, ItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class InventoryItemService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createInventoryItem(
    input: InventoryItemEntity.CreateInventoryItemInput,
    userContext: UserContext,
  ): Promise<InventoryItemEntity.CreateInventoryItemPayload> {
    try {
      logger.debug({ message: 'InventoryItem Service: createInventoryItem', payload: { input } });
      const payload = await this.rpcCall<
        InventoryItemEntity.CreateInventoryItemInput,
        InventoryItemEntity.CreateInventoryItemPayload
      >('createInventoryItem')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateInventoryItem(
    input: InventoryItemEntity.UpdateInventoryItemInput,
    userContext: UserContext,
  ): Promise<InventoryItemEntity.UpdateInventoryItemPayload> {
    logger.debug({ message: 'InventoryItem Service: updateInventoryItem', payload: { input } });
    const payload = await this.rpcCall<
      InventoryItemEntity.UpdateInventoryItemInput,
      InventoryItemEntity.UpdateInventoryItemPayload
    >('updateInventoryItem')(input, userContext);
    return payload;
  }

  static async deleteInventoryItems(
    input: ItemEntity.DeleteItemsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'InventoryItem Service: deleteInventoryItems', payload: { input } });
    const payload = await this.rpcCall<ItemEntity.DeleteItemsInput, Entity.MutationResponse>('deleteInventoryItems')(
      input,
      userContext,
    );
    return payload;
  }

  /** Queries */
  static async getAllInventoryItems(
    input: InventoryItemEntity.GetAllInventoryItemsInput,
    userContext: UserContext,
  ): Promise<InventoryItemEntity.GetAllInventoryItemsPayload> {
    logger.debug({ message: 'InventoryItem Service: getAllInventoryItems', payload: { input } });
    const payload = await this.rpcCall<
      InventoryItemEntity.GetAllInventoryItemsInput,
      InventoryItemEntity.GetAllInventoryItemsPayload
    >('getAllInventoryItems')(input, userContext);
    return payload;
  }
  static async getPaginatedInventoryItems(
    input: InventoryItemEntity.GetPaginatedInventoryItemsInput,
    userContext: UserContext,
  ): Promise<InventoryItemEntity.PaginatedInventoryItemsPayload> {
    logger.debug({
      message: 'InventoryItem Service: getPaginatedInventoryItems',
      payload: { input },
    });
    const payload = await this.rpcCall<
      InventoryItemEntity.GetPaginatedInventoryItemsInput,
      InventoryItemEntity.PaginatedInventoryItemsPayload
    >('getPaginatedInventoryItems')(input, userContext);
    return payload;
  }
}
