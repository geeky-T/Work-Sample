import { AbilityProps, GenericPermissionType } from '../../../../acl';
import { AssetItemActionsEnum, AssetItemSubjectsEnum } from '../../enums';

export type AssetItemPermissions = {
  [AssetItemSubjectsEnum.ASSET]:
  | AssetItemActionsEnum.CREATE
  | AssetItemActionsEnum.DELETE
  | AssetItemActionsEnum.EDIT
  | AssetItemActionsEnum.READ;
};

export type AssetItemPermission = GenericPermissionType<AssetItemPermissions>;
export type AssetItemAbilityProps = AbilityProps<AssetItemPermission>;
