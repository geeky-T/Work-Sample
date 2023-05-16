import { AssetItemSchema } from '../../schemas';

export type GetAssetItemsByIdsAcrossTenantsPayload = {
  assetItems: Array<AssetItemSchema>;
};
