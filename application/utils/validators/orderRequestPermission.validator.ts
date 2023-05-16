// import { OrderPickPermissionEnum, PickOrderItemTypeEnum } from '@const/orderPickPermissions';
// import {
//   CREATE_ORDER_PERMISSIONS,
//   DELETE_ORDER_PERMISSIONS,
//   GetOrderRequestAccessTypeEnum,
//   GetOrderRequestListAccessTypeEnum,
//   GET_ORDER_LIST_PERMISSIONS,
//   GET_ORDER_PERMISSIONS,
//   OrderRequestPermissionEnum,
//   UPDATE_ORDER_PERMISSIONS,
// } from '@const/orderRequestPermissions';
// import { ForbiddenError } from '@procurenetworks/backend-utils';
// import { UserContext } from '@procurenetworks/inter-service-contracts';

import { ForbiddenError } from '@procurenetworks/backend-utils';
import { UserContext, WorkspaceEntity } from '@procurenetworks/inter-service-contracts';
import { PickOrderItemTypeEnum } from '../../const/orderPickPermissions';
import { RoleService } from '../../transport/__grpc/client/services';

export class PermissionValidator {
  //   static verifyCreateOrderPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     CREATE_ORDER_PERMISSIONS.forEach((permission) => {
  //       if (!userPermissions.includes(permission)) {
  //         throw new ForbiddenError({
  //           message: 'Please contact your Admin to create this order.',
  //           where: 'orderRequestPermissionValidator - verifyCreateOrderPermissions',
  //         });
  //       }
  //     });
  //   }

  //   static verifyOrderFetchPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     GET_ORDER_PERMISSIONS.forEach((permission) => {
  //       if (!userPermissions.includes(permission)) {
  //         throw new ForbiddenError({
  //           message: 'Please contact your Admin to access this order.',
  //           where: 'orderRequestPermissionValidator - verifyOrderFetchPermissions',
  //         });
  //       }
  //     });
  //   }

  static async verifyReturnOrderPermissions(userContext: UserContext): Promise<void> {
    const { permissions } = await RoleService.getCurrentUserWorkspacePermissions(userContext);
    if (
      !permissions.some(
        (permission) =>
          permission.action === WorkspaceEntity.AllowedPermissionActionsEnum.RETURN &&
          permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.ORDER_REQUEST,
      )
    ) {
      throw new ForbiddenError({
        message: 'Only the requestor and the recipient are allowed to return items of an order.',
        where: `${__filename} - ${this.verifyReturnOrderPermissions.name}`,
      });
    }
  }
  //   static verifyOrderListFetchPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     GET_ORDER_LIST_PERMISSIONS.forEach((permission) => {
  //       if (!userPermissions.includes(permission)) {
  //         throw new ForbiddenError({
  //           message: 'Please contact your Admin to return items in this order.',
  //           where: 'orderRequestPermissionValidator - verifyReturnOrderPermissions',
  //         });
  //       }
  //     });
  //   }

  //   static verifyOrderReportFetchPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     if (!userPermissions.includes(OrderRequestPermissionEnum.ORDER_REPORT_VIEW)) {
  //       throw new ForbiddenError({
  //         message: 'Please contact your Admin to access order reports.',
  //         where: 'orderRequestPermissionValidator - verifyOrderReportFetchPermissions',
  //       });
  //     }
  //   }

  //   static verifyDeleteOrderPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     DELETE_ORDER_PERMISSIONS.forEach((permission) => {
  //       if (!userPermissions.includes(permission)) {
  //         throw new ForbiddenError({
  //           message: 'Please contact your Admin to delete this order.',
  //           where: 'orderRequestPermissionValidator - verifyDeleteOrderPermissions',
  //         });
  //       }
  //     });
  //   }

  static async verifyOrderRequestPickPermissions(userContext: UserContext): Promise<void> {
    const { permissions } = await RoleService.getCurrentUserWorkspacePermissions(userContext);
    if (
      !permissions.some(
        (permission) =>
          permission.action === WorkspaceEntity.AllowedPermissionActionsEnum.CREATE &&
          (permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.ASSET_SHIPMENT ||
            permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.INVENTORY_SHIPMENT),
      )
    ) {
      throw new ForbiddenError({
        message: 'Please contact your Admin to pick this order.',
        where: `${__filename} - ${this.verifyOrderRequestPickPermissions.name}`,
      });
    }
  }

  //   static verifyUpdateOrderPermissions({ currentUserInfo }: UserContext): void {
  //     const { permissions: userPermissions } = currentUserInfo;
  //     UPDATE_ORDER_PERMISSIONS.forEach((permission) => {
  //       if (!userPermissions.includes(permission)) {
  //         throw new ForbiddenError({
  //           message: 'Please contact your Admin to update this order.',
  //           where: 'orderRequestPermissionValidator - verifyUpdateOrderPermissions',
  //         });
  //       }
  //     });
  //   }

  //   static getOrderRequestListAccessLevel(userContext: UserContext): GetOrderRequestListAccessTypeEnum {
  //     const {
  //       currentUserInfo: { permissions: userPermissions },
  //     } = userContext;
  //     if (
  //       userPermissions.includes(OrderRequestPermissionEnum.ORDER_PICK) ||
  //       userPermissions.includes(OrderRequestPermissionEnum.ORDER_VIEW) ||
  //       userPermissions.includes(OrderRequestPermissionEnum.MULTI_TENANT)
  //     ) {
  //       return GetOrderRequestListAccessTypeEnum.ALL;
  //     }
  //     if (userPermissions.includes(OrderRequestPermissionEnum.NOTIFICATION_MINIMUM_QUANTITY_SITE)) {
  //       return GetOrderRequestListAccessTypeEnum.SITE_MANAGER;
  //     }
  //     if (userPermissions.includes(OrderRequestPermissionEnum.NOTIFICATION_MINIMUM_QUANTITY_CATEGORY)) {
  //       return GetOrderRequestListAccessTypeEnum.CATEGORY_MANAGER;
  //     }
  //     if (
  //       userPermissions.includes(OrderRequestPermissionEnum.NOTIFICATION_NO_SKU) &&
  //       userPermissions.includes(OrderRequestPermissionEnum.NOTIFICATION_NO_SKU_SITE)
  //     ) {
  //       return GetOrderRequestListAccessTypeEnum.BUYER;
  //     }

  //     return GetOrderRequestListAccessTypeEnum.BASIC_USER;
  //   }

  //   static getOrderRequestAccessLevel(userContext: UserContext): GetOrderRequestAccessTypeEnum {
  //     const orderListLevel = PermissionValidator.getOrderRequestListAccessLevel(userContext);
  //     if (orderListLevel === GetOrderRequestListAccessTypeEnum.BASIC_USER) {
  //       return GetOrderRequestAccessTypeEnum.USER;
  //     }
  //     return GetOrderRequestAccessTypeEnum.TENANT;
  //   }

  static async getPickItemsAccessTypes(userContext: UserContext): Promise<{
    asset: boolean;
    inventory: boolean;
  }> {
    const { permissions } = await RoleService.getCurrentUserWorkspacePermissions(userContext);
    if (
      !permissions.some(
        (permission) =>
          permission.action === WorkspaceEntity.AllowedPermissionActionsEnum.CREATE &&
          (permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.ASSET_SHIPMENT ||
            permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.INVENTORY_SHIPMENT),
      )
    ) {
      throw new ForbiddenError({
        message: 'Please contact your Admin to pick this order.',
        where: `${__filename} - ${this.verifyOrderRequestPickPermissions.name}`,
      });
    }
    return {
      [PickOrderItemTypeEnum.ASSET]: permissions.some(
        (permission) =>
          permission.action === WorkspaceEntity.AllowedPermissionActionsEnum.CREATE &&
          permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.ASSET_SHIPMENT,
      ),
      [PickOrderItemTypeEnum.INVENTORY]: permissions.some(
        (permission) =>
          permission.action === WorkspaceEntity.AllowedPermissionActionsEnum.CREATE &&
          permission.subject === WorkspaceEntity.AllowedPermissionsSubjectEnum.INVENTORY_SHIPMENT,
      ),
    };
  }
}
