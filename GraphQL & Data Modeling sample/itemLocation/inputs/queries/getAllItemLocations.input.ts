import { GetAllEntityProps } from '../../../Entity';
import { ItemLocationSchema } from '../../schemas';
import { ItemLocationFilters } from './itemLocation.filters';

export type GetAllItemLocationsInput = GetAllEntityProps<ItemLocationFilters, ItemLocationSchema>;
