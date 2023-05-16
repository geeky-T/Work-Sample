import { GetDistinctValuesForAllEntityInput } from '../../../Entity';
import { InventoryItemSchema } from '../../schemas';
import { InventoryItemFilters } from './inventoryItem.filters';

export type GetDistinctValuesForAllInventoryItemInput = GetDistinctValuesForAllEntityInput<
  InventoryItemFilters,
  InventoryItemSchema
>;
