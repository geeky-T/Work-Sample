import { GetDistinctValuesForAllEntityInput } from '../../../Entity';
import { AssetItemSchema } from '../../schemas';
import { AssetItemFilters } from './assetItem.filters';

export type GetDistinctValuesForAllAssetItemInput = GetDistinctValuesForAllEntityInput<AssetItemFilters, AssetItemSchema>;
