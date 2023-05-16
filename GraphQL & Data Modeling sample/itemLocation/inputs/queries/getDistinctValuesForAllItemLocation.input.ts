import { GetDistinctValuesForAllEntityInput } from '../../../Entity';
import { ItemLocationSchema } from '../../schemas';
import { ItemLocationFilters } from './itemLocation.filters';

export type GetDistinctValuesForAllItemLocationInput = GetDistinctValuesForAllEntityInput<
  ItemLocationFilters,
  ItemLocationSchema
>;
