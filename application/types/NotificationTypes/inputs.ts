import { CoreUserResponseType } from '../CoreTypes/response';

export type CategorizedUsersBasedOnPermissionInput = {
  assetManagers?: Array<CoreUserResponseType>;
  inventoryManagers?: Array<CoreUserResponseType>;
  noSkuBuyers?: Array<CoreUserResponseType>;
  siteManagers?: Array<CoreUserResponseType>;
};
