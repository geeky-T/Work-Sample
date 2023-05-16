export enum OrderRequestPermissionEnum {
  MULTI_TENANT = 'multi_tenant',
  NOTIFICATION_MINIMUM_QUANTITY_CATEGORY = 'notification_minq_category',
  NOTIFICATION_MINIMUM_QUANTITY_SITE = 'notification_minq_site',
  NOTIFICATION_NO_SKU = 'ntf_or_no_sku',
  NOTIFICATION_NO_SKU_SITE = 'ntf_or_no_sku_site',
  ORDER_ACCESS = 'or_login',
  ORDER_CREATE = 'or_new',
  ORDER_DELETE = 'or_delete',
  ORDER_PICK = 'or_pick',
  ORDER_REPORT_VIEW = 'report_view',
  ORDER_UPDATE = 'or_edit',
  ORDER_VIEW = 'or_view',
}

export const CREATE_ORDER_PERMISSIONS = [OrderRequestPermissionEnum.ORDER_ACCESS, OrderRequestPermissionEnum.ORDER_CREATE];

export const UPDATE_ORDER_PERMISSIONS = [OrderRequestPermissionEnum.ORDER_ACCESS, OrderRequestPermissionEnum.ORDER_UPDATE];

export const DELETE_ORDER_PERMISSIONS = [OrderRequestPermissionEnum.ORDER_ACCESS, OrderRequestPermissionEnum.ORDER_DELETE];

export enum GetOrderRequestListAccessTypeEnum {
  ALL = 'all',
  BASIC_USER = 'user',
  BUYER = 'buyer',
  CATEGORY_MANAGER = 'category-manager',
  SITE_MANAGER = 'site-manager',
}

export enum GetOrderRequestAccessTypeEnum {
  TENANT = 'tenant',
  USER = 'user',
}

export const GET_ORDER_PERMISSIONS = [OrderRequestPermissionEnum.ORDER_ACCESS];
export const GET_ORDER_LIST_PERMISSIONS = [OrderRequestPermissionEnum.ORDER_ACCESS];
