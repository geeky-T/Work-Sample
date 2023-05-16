import { AbilityProps, GenericPermissionType } from '../../../../acl';
import { InventoryItemActionsEnum, InventoryItemSubjectsEnum } from '../../enums';

export type InventoryItemPermissions = {
  [InventoryItemSubjectsEnum.INVENTORY]:
  | InventoryItemActionsEnum.CREATE
  | InventoryItemActionsEnum.DELETE
  | InventoryItemActionsEnum.EDIT
  | InventoryItemActionsEnum.READ;
};

export type InventoryItemPermission = GenericPermissionType<InventoryItemPermissions>;
export type InventoryItemAbilityProps = AbilityProps<InventoryItemPermission>;
