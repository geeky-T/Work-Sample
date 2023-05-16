import { GetPaginatedEntityInput } from '../../../Entity';
import { ItemLocationSchema } from '../../schemas';
import { ItemLocationFilters } from './itemLocation.filters';

export type GetPaginatedItemLocationsInput = GetPaginatedEntityInput<ItemLocationFilters, ItemLocationSchema>;
