import { RequireSome } from '@procurenetworks/backend-utils';
import { GetAllEntityProps } from '../../../Entity';
import { ItemSchema } from '../../schemas';
import { ItemFilters } from './item.filters';

export type GetItemsByIdsAcrossTenantsInput = GetAllEntityProps<RequireSome<ItemFilters, 'itemIds'>, ItemSchema>;
