import { GetAllEntityProps } from '../../../Entity';
import { InventoryItemSchema } from '../../schemas';
import { InventoryItemFilters } from './inventoryItem.filters';

export type GetAllInventoryItemsInput = GetAllEntityProps<InventoryItemFilters, InventoryItemSchema>;
