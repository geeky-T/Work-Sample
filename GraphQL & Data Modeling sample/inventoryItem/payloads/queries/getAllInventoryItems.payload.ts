import { InventoryItemSchema } from '../../schemas';

export type GetAllInventoryItemsPayload = {
  inventoryItems: Array<InventoryItemSchema>;
};
