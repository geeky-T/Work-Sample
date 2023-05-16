import { MinimalSiteResponseType } from '@custom-types/InventoryTypes/response';
import { Entity, OrderRequestEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrderRequestServiceV2 } from '@services/orderRequest/orderRequest.service';
// import { PermissionValidator } from '@utils/validators/orderRequestPermission.validator';
import { OrderRequestItemServiceV2 } from '../../services/orderRequestItem/orderRequestItem.service';
import { GetOrderRequestsReportInput } from '../../types/OrderRequestReport';

export class OrderRequestController {
  /* Queries */
  static async getAllExpandedOrderRequests(
    getOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsPayload> {
    // PermissionValidator.verifyOrderFetchPermissions(userContext);
    return OrderRequestServiceV2.getAllExpandedOrderRequests(getOrderRequestsInput, userContext);
  }

  static async getOrderRequestsByIdsAcrossTenants(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsPayload> {
    try {
      const payload = await OrderRequestServiceV2.getOrderRequestsByIdsAcrossTenants(input, userContext);
      return payload;
    } catch (error: any) {
      throw error;
    }
  }

  static async getExpandedOrderRequestsByIdsAcrossTenantsWithoutItems(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsWithoutItemsPayload> {
    try {
      const payload = await OrderRequestServiceV2.getExpandedOrderRequestsByIdsAcrossTenantsWithoutItems(input, userContext);
      return payload;
    } catch (error: any) {
      throw error;
    }
  }

  static async getExpandedOrderRequestsByIdsAcrossTenantsPayload(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetExpandedOrderRequestsByIdsAcrossTenantsPayload> {
    try {
      const payload = await OrderRequestServiceV2.getExpandedOrderRequestsByIdsAcrossTenants(input, userContext);
      return payload;
    } catch (error: any) {
      throw error;
    }
  }

  static async getAllExpandedOrderRequestsWithoutItems(
    getOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsWithoutItemsPayload> {
    // PermissionValidator.verifyOrderFetchPermissions(userContext);
    return OrderRequestServiceV2.getAllExpandedOrderRequestsWithoutItems(getOrderRequestsInput, userContext);
  }

  static async getAllOrderRequests(
    getOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllOrderRequestsPayload> {
    // PermissionValidator.verifyOrderFetchPermissions(userContext);
    return OrderRequestServiceV2.getAllOrderRequests(getOrderRequestsInput, userContext);
  }

  static async getExpandedOrderRequest(
    getOrderRequestInput: OrderRequestEntity.GetOrderRequestInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.ExpandedOrderRequestType> {
    // PermissionValidator.verifyOrderFetchPermissions(userContext);
    return OrderRequestServiceV2.getExpandedOrderRequest(getOrderRequestInput, userContext);
  }

  static async getPaginatedExpandedOrderRequestsDeprecated(
    getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload> {
    // PermissionValidator.verifyOrderListFetchPermissions(userContext);
    return OrderRequestServiceV2.getPaginatedExpandedOrderRequestsDeprecated(getPaginatedOrderRequestsInput, userContext);
  }

  static async getPaginatedExpandedOrderRequestsBasedOnAccessLevelDeprecated(
    getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload> {
    return OrderRequestServiceV2.getPaginatedExpandedOrderRequestsDeprecated(getPaginatedOrderRequestsInput, userContext);
  }

  static async getPaginatedOrderRequestsDeprecated(
    getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetPaginatedOrderRequestsPayload> {
    return OrderRequestServiceV2.getPaginatedOrderRequestsDeprecated(getPaginatedOrderRequestsInput, userContext);
  }

  static async getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASite(
    getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteInput: OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASitePayload> {
    return OrderRequestServiceV2.getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASite(
      getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteInput,
      userContext,
    );
  }

  static async getOrderRequestsReport(
    orderRequestReportInput: GetOrderRequestsReportInput,
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.ExpandedOrderRequestType>> {
    return OrderRequestServiceV2.getOrderRequestsReport(orderRequestReportInput, userContext);
  }

  static async getReportOrderRequestGRPC(
    orderRequestReportInput: OrderRequestEntity.GetReportOrderRequestsGRPCInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetReportOrderRequestsGRPCPayload> {
    const { filters } = orderRequestReportInput;
    const orderRequests = await OrderRequestServiceV2.getOrderRequestsReport(filters, userContext);
    return { orderRequests };
  }

  static async getReportOrderRequestCodes(
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema['orderRequestCode']>> {
    return OrderRequestServiceV2.getReportOrderRequestCodes(userContext);
  }

  /* Mutations */
  static async attachAvailableAtSiteIdsToOrderRequests(
    attachAvailableAtSiteIdsInput: Array<OrderRequestEntity.AttachAvailableAtSiteIdsInput>,
  ): Promise<void> {
    await OrderRequestServiceV2.attachAvailableAtSiteIds(attachAvailableAtSiteIdsInput);
  }

  static async blockOrderRequestAndGetOpenOrderRequestItem(
    blockOrderRequestInput: OrderRequestEntity.BlockOrderRequestInput,
    userContext: UserContext,
  ): Promise<MinimalSiteResponseType[]> {
    await OrderRequestServiceV2.blockOrderRequest(blockOrderRequestInput, userContext);
    const sites = await OrderRequestItemServiceV2.getSitesForOpenOrderRequestItemsOfAnOrderRequest(
      blockOrderRequestInput,
      userContext,
    );
    return sites;
  }

  static async createOrderRequest(
    createOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    if (createOrderRequestInput.type && createOrderRequestInput.type === OrderRequestEntity.OrderRequestTypeEnum.EXTERNAL) {
      return OrderRequestServiceV2.createExternalOrderRequest(createOrderRequestInput, userContext);
    }
    return OrderRequestServiceV2.createOrderRequest(createOrderRequestInput, userContext);
  }

  static async closeOrderRequest(
    closeOrderRequestInput: OrderRequestEntity.CloseOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestServiceV2.closeOrderRequest(closeOrderRequestInput, userContext);
  }

  static async deleteOrderRequest(
    deleteOrderRequestInput: OrderRequestEntity.DeleteOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestServiceV2.deleteOrderRequest(deleteOrderRequestInput, userContext);
  }

  static async extendBlockTimerOfOrderRequest(
    blockOrderRequestInput: OrderRequestEntity.BlockOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestServiceV2.blockOrderRequest(blockOrderRequestInput, userContext);
  }

  static async unblockOrderRequest(
    unblockOrderRequestInput: OrderRequestEntity.UnblockOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestServiceV2.unblockOrderRequest(unblockOrderRequestInput, userContext);
  }

  static async updateOrderRequest(
    updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    if (
      updateOrderRequestInput.updates.type &&
      updateOrderRequestInput.updates.type === OrderRequestEntity.OrderRequestTypeEnum.EXTERNAL
    ) {
      return OrderRequestServiceV2.updateExternalOrderRequest(updateOrderRequestInput, userContext);
    }
    return OrderRequestServiceV2.updateOrderRequest(updateOrderRequestInput, userContext);
  }

  static async updateLeastItemStatus(
    updateLeastItemStatusInput: OrderRequestEntity.UpdateLeastItemStatusInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    return OrderRequestServiceV2.updateLeastItemStatus(updateLeastItemStatusInput, userContext);
  }
}
