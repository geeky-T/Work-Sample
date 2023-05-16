import { GetPaginatedEntityInput } from '../../../Entity';
import { ItemFilters } from '../../../item';
import { AssetItemSchema } from '../../schemas';

export type GetPaginatedAssetItemsInput = GetPaginatedEntityInput<ItemFilters, AssetItemSchema>;
