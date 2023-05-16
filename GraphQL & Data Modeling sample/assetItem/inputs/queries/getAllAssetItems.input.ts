import { GetAllEntityProps } from '../../../Entity';
import { AssetItemSchema } from '../../schemas';
import { AssetItemFilters } from './assetItem.filters';

export type GetAllAssetItemsInput = GetAllEntityProps<AssetItemFilters, AssetItemSchema>;
