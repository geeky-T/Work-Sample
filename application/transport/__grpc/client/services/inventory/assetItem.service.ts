import { logger } from '@procurenetworks/backend-utils';
import { AssetItemEntity, Entity, ItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class AssetItemService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createAssetItem(
    input: AssetItemEntity.CreateAssetItemInput,
    userContext: UserContext,
  ): Promise<AssetItemEntity.CreateAssetItemPayload> {
    try {
      logger.debug({ message: 'AssetItem Service: createAssetItem', payload: { input } });
      const payload = await this.rpcCall<AssetItemEntity.CreateAssetItemInput, AssetItemEntity.CreateAssetItemPayload>(
        'createAssetItem',
      )(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateAssetItem(
    input: AssetItemEntity.UpdateAssetItemInput,
    userContext: UserContext,
  ): Promise<AssetItemEntity.UpdateAssetItemPayload> {
    logger.debug({ message: 'AssetItem Service: updateAssetItem', payload: { input } });
    const payload = await this.rpcCall<AssetItemEntity.UpdateAssetItemInput, AssetItemEntity.UpdateAssetItemPayload>(
      'updateAssetItem',
    )(input, userContext);
    return payload;
  }

  static async deleteAssetItems(
    input: ItemEntity.DeleteItemsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'AssetItem Service: deleteAssetItems', payload: { input } });
    const payload = await this.rpcCall<ItemEntity.DeleteItemsInput, Entity.MutationResponse>('deleteAssetItems')(
      input,
      userContext,
    );
    return payload;
  }

  /** Queries */
  static async getAllAssetItems(
    input: AssetItemEntity.GetAllAssetItemsInput,
    userContext: UserContext,
  ): Promise<AssetItemEntity.GetAllAssetItemsPayload> {
    logger.debug({ message: 'AssetItem Service: getAllAssetItems', payload: { input } });
    const payload = await this.rpcCall<AssetItemEntity.GetAllAssetItemsInput, AssetItemEntity.GetAllAssetItemsPayload>(
      'getAllAssetItems',
    )(input, userContext);
    return payload;
  }
  static async getPaginatedAssetItems(
    input: AssetItemEntity.GetPaginatedAssetItemsInput,
    userContext: UserContext,
  ): Promise<AssetItemEntity.PaginatedAssetItemsPayload> {
    logger.debug({ message: 'AssetItem Service: getPaginatedAssetItems', payload: { input } });
    const payload = await this.rpcCall<
      AssetItemEntity.GetPaginatedAssetItemsInput,
      AssetItemEntity.PaginatedAssetItemsPayload
    >('getPaginatedAssetItems')(input, userContext);
    return payload;
  }
}
