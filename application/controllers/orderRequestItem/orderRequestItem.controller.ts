import { Entity, OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrderRequestItemServiceV2 } from '@services/orderRequestItem/orderRequestItem.service';
// import { PermissionValidator } from '@utils/validators/orderRequestPermission.validator';

export class OrderRequestItemController {
  /* Queries */
  static async getAllOrderRequestItems(
    getOrderRequestItemInput: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    // PermissionValidator.verifyOrderFetchPermissions(userContext);
    return OrderRequestItemServiceV2.getAllOrderRequestItems(getOrderRequestItemInput, userContext);
  }

  static async getOrderRequestItemsByIdsAcrossTenants(
    input: OrderRequestItemEntity.GetOrderRequestItemsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    try {
      const payload = await OrderRequestItemServiceV2.getOrderRequestItemsByIdsAcrossTenants(input);
      return payload;
    } catch (error: any) {
      throw error;
    }
  }

  static async getOrderRequestItemsByOrderRequestIdsAcrossTenants(
    input: OrderRequestItemEntity.GetOrderRequestItemsByOrderRequestIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    try {
      const payload = await OrderRequestItemServiceV2.getOrderRequestItemsByOrderRequestIdsAcrossTenants(input);
      return payload;
    } catch (error: any) {
      throw error;
    }
  }

  static async getDistinctValuesForAllOrderRequestItems<T extends keyof OrderRequestItemEntity.OrderRequestItemSchema>(
    getAllOrderRequestItemsInput: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    field: T,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.OrderRequestItemSchema[T][]> {
    return OrderRequestItemServiceV2.getDistinctValuesForAllOrderRequestItems<typeof field>(
      getAllOrderRequestItemsInput,
      field,
      userContext,
    );
  }

  /* Mutations */
  static async deleteOrderRequestItemsByItemIds(
    deleteOrderRequestItemsByItemIdsInput: OrderRequestItemEntity.DeleteOrderRequestItemsByItemIdsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestItemServiceV2.deleteOrderRequestItemsByItemIds(deleteOrderRequestItemsByItemIdsInput, userContext);
  }

  static async resendReturnedOrderRequestItemEmail(
    resendReturnedOrderRequestItemEmailInput: OrderRequestItemEntity.ResendReturnedOrderRequestItemEmailInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestItemServiceV2.resendReturnedOrderRequestItemEmail(
      resendReturnedOrderRequestItemEmailInput,
      userContext,
    );
  }

  static async returnOrderRequestItems(
    returnOrderRequestItemsInput: OrderRequestItemEntity.ReturnOrderRequestItemsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestItemServiceV2.returnOrderRequestItems(returnOrderRequestItemsInput, userContext);
  }

  static async updateOrderRequestItemsStatusByItemRestockUpdates(
    updateOrderRequestItemsStatusByItemRestockUpdatesInput: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByItemRestockUpdatesInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestItemServiceV2.updateOrderRequestItemsStatusByItemRestockUpdates(
      updateOrderRequestItemsStatusByItemRestockUpdatesInput,
      userContext,
    );
  }

  static async unpackOrderRequestItemsOfTrackingIds(
    unpackOrderRequestItemsOfTrackingIdsInput: OrderRequestItemEntity.UnpackOrderRequestItemsOfTrackingIdsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    await OrderRequestItemServiceV2.unpackOrderRequestItemsOfTrackingIds(
      unpackOrderRequestItemsOfTrackingIdsInput,
      userContext,
    );
    return { success: true };
  }

  static async updateOrderRequestItemsStatusByTrackingUpdates(
    updateOrderRequestItemsStatusByTrackingUpdatesInput: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    // PermissionValidator.verifyUpdateOrderPermissions(userContext);
    return OrderRequestItemServiceV2.updateOrderRequestItemsStatusByTrackingUpdates(
      updateOrderRequestItemsStatusByTrackingUpdatesInput,
      userContext,
    );
  }

  static async updateOrderRequestItemStatusByOrderRequestId(
    updateOrderRequestItemStatusByOrderRequestIdInput: OrderRequestItemEntity.UpdateOrderRequestItemStatusByOrderRequestIdInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestItemServiceV2.updateOrderRequestItemStatusByOrderRequestId(
      updateOrderRequestItemStatusByOrderRequestIdInput,
      userContext,
    );
  }
}
