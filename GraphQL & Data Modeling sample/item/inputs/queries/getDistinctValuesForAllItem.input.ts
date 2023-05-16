import { GetDistinctValuesForAllEntityInput } from '../../../Entity';
import { ItemSchema } from '../../schemas';
import { ItemFilters } from './item.filters';

export type GetDistinctValuesForAllItemInput = GetDistinctValuesForAllEntityInput<ItemFilters, ItemSchema>;
