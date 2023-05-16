import { ItemFilters } from '.';
import { GetPaginatedEntityInput } from '../../../Entity/interfaces';
import { ItemUnionType } from '../../unions';

export type GetPaginatedItemsInput = GetPaginatedEntityInput<ItemFilters, ItemUnionType>;
