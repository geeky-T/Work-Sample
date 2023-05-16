import { InventoryItemSchema } from '../../schemas';

export type GetInventoryItemsByIdsAcrossTenantsPayload = {
  inventoryItems: Array<InventoryItemSchema>;
};
