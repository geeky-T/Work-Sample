import { logger } from '@procurenetworks/backend-utils';
import { Entity, ItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class ItemService extends InventoryServiceRPCClient {
  /** Queries */
  static async getAllItems(
    input: ItemEntity.GetAllItemsInput,
    userContext: UserContext,
  ): Promise<ItemEntity.GetAllItemsPayload> {
    logger.debug({ message: 'Item Service: getAllItems', payload: { input } });
    const payload = await this.rpcCall<ItemEntity.GetAllItemsInput, ItemEntity.GetAllItemsPayload>('getAllItems')(
      input,
      userContext,
    );
    return payload;
  }
  static async getPaginatedItems(
    input: ItemEntity.GetPaginatedItemsInput,
    userContext: UserContext,
  ): Promise<ItemEntity.PaginatedItemsPayload> {
    logger.debug({ message: 'Item Service: getPaginatedItems', payload: { input } });
    const payload = await this.rpcCall<ItemEntity.GetPaginatedItemsInput, ItemEntity.PaginatedItemsPayload>(
      'getPaginatedItems',
    )(input, userContext);
    return payload;
  }
  static async getPaginatedItemsDeprecated(
    input: ItemEntity.GetPaginatedItemsInput,
    userContext: UserContext,
  ): Promise<Entity.GetPaginatedEntitiesPayload<ItemEntity.ItemSchema>> {
    logger.debug({ message: 'Item Service: getPaginatedItemsDeprecated', payload: { input } });
    const payload = await this.rpcCall<
      ItemEntity.GetPaginatedItemsInput,
      Entity.GetPaginatedEntitiesPayload<ItemEntity.ItemSchema>
    >('getPaginatedItemsDeprecated')(input, userContext);
    return payload;
  }
}
