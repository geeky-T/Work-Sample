import { RequireSome } from '@procurenetworks/backend-utils';
import { GetAllEntityProps } from '../../../Entity';
import { AssetItemSchema } from '../../schemas';
import { AssetItemFilters } from './assetItem.filters';

export type GetAssetItemsByIdsAcrossTenantsInput = GetAllEntityProps<
  RequireSome<AssetItemFilters, 'itemIds'>,
  AssetItemSchema
>;
