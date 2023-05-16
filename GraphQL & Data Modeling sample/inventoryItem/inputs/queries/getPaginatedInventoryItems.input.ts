import { GetPaginatedEntityInput } from '../../../Entity';
import { InventoryItemSchema } from '../../schemas';
import { InventoryItemFilters } from './inventoryItem.filters';

export type GetPaginatedInventoryItemsInput = GetPaginatedEntityInput<InventoryItemFilters, InventoryItemSchema>;
