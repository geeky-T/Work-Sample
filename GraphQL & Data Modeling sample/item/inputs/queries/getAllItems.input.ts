import { GetAllEntityProps } from '../../../Entity';
import { ItemUnionType } from '../../unions';
import { ItemFilters } from './item.filters';

export type GetAllItemsInput = GetAllEntityProps<ItemFilters, ItemUnionType>;
