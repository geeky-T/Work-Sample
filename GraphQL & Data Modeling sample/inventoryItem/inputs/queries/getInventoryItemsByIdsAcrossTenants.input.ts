import { RequireSome } from '@procurenetworks/backend-utils';
import { GetAllEntityProps } from '../../../Entity';
import { InventoryItemSchema } from '../../schemas';
import { InventoryItemFilters } from './inventoryItem.filters';

export type GetInventoryItemsByIdsAcrossTenantsInput = GetAllEntityProps<
  RequireSome<InventoryItemFilters, 'itemIds'>,
  InventoryItemSchema
>;
