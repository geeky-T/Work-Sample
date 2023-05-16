import { AbilityProps, GenericPermissionType } from '../../../../acl';
import { ItemLocationActionsEnum, ItemLocationSubjectsEnum } from '../../enums';

// REVIEW: Confirm other operations.
export type ItemLocationPermissions = {
  [ItemLocationSubjectsEnum.TRANSACTION]:
    | ItemLocationActionsEnum.CREATE
    | ItemLocationActionsEnum.DELETE
    | ItemLocationActionsEnum.EDIT
    | ItemLocationActionsEnum.READ;
};

export type ItemLocationPermission = GenericPermissionType<ItemLocationPermissions>;
export type ItemLocationAbilityProps = AbilityProps<ItemLocationPermission>;
