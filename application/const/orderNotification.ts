import { WorkspaceEntity } from '@procurenetworks/inter-service-contracts';

export const NOTIFICATION_PERMISSIONS_ENUM = {
  ASSET_MANAGER: {
    ASSET_PERMISSION: 'ntf_or_asset_sku',
  },
  BUYER: {
    NO_SKU_PERMISSION: 'ntf_or_no_sku',
  },
  INV_MANAGER: {
    INV_PERMISSION: 'ntf_or_inv_sku',
  },
  SITE_MANAGER: {
    ASSET_PERMISSION: 'ntf_or_asset_sku_site',
    INV_PERMISSION: 'ntf_or_inv_sku_site',
    NO_SKU_PERMISSION: 'ntf_or_no_sku_site',
  },
};

export const MAIL_SUBJECTS = {
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_CREATED]: 'Order Request Confirmation',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_DELETED]: 'Order Request Cancelled',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_UPDATED]: 'Order Request Updated',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_DELIVERED]: 'Order Request Delivered',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_RECEIVED]: 'Order Request Received',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_ITEMS_RETURNED]: 'Order Request Returned',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST_STATUS_UPDATED]: 'Order Request Status Updated',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.PICK_LIST_CREATED]: 'Order Packing List',
  [WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_READY_FOR_PICK_UP]: 'Order Ready For Pick Up',
};
