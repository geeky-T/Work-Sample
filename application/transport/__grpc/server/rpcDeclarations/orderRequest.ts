import { Entity, OrderRequestEntity, serviceRequest } from '@procurenetworks/inter-service-contracts';
import { OrderRequestController } from '../../../../controllers/orderRequest/orderRequest.controller';

export const OrderRequestQueries = {
  getAllExpandedOrderRequests: serviceRequest<
    OrderRequestEntity.GetAllOrderRequestsInput,
    OrderRequestEntity.GetAllExpandedOrderRequestsPayload
  >(OrderRequestController.getAllExpandedOrderRequests),
  getAllExpandedOrderRequestsWithoutItems: serviceRequest<
    OrderRequestEntity.GetAllOrderRequestsInput,
    OrderRequestEntity.GetAllExpandedOrderRequestsWithoutItemsPayload
  >(OrderRequestController.getAllExpandedOrderRequestsWithoutItems),
  getAllOrderRequests: serviceRequest<
    OrderRequestEntity.GetAllOrderRequestsInput,
    OrderRequestEntity.GetAllOrderRequestsPayload
  >(OrderRequestController.getAllOrderRequests),
  getPaginatedExpandedOrderRequestsDeprecated: serviceRequest<
    OrderRequestEntity.GetPaginatedOrderRequestsInput,
    OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload
  >(OrderRequestController.getPaginatedExpandedOrderRequestsDeprecated),
  getPaginatedExpandedOrderRequestsBasedOnAccessLevelDeprecated: serviceRequest<
    OrderRequestEntity.GetPaginatedOrderRequestsInput,
    OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload
  >(OrderRequestController.getPaginatedExpandedOrderRequestsBasedOnAccessLevelDeprecated),
  getPaginatedOrderRequestsDeprecated: serviceRequest<
    OrderRequestEntity.GetPaginatedOrderRequestsInput,
    OrderRequestEntity.GetPaginatedOrderRequestsPayload
  >(OrderRequestController.getPaginatedOrderRequestsDeprecated),
  getReportOrderRequests: serviceRequest<
    OrderRequestEntity.GetReportOrderRequestsGRPCInput,
    OrderRequestEntity.GetReportOrderRequestsGRPCPayload
  >(OrderRequestController.getReportOrderRequestGRPC),
  getOrderRequestsByIdsAcrossTenants: serviceRequest<
    OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    OrderRequestEntity.GetAllOrderRequestsPayload
  >(OrderRequestController.getOrderRequestsByIdsAcrossTenants),
};

export const OrderRequestMutations = {
  closeOrderRequest: serviceRequest<OrderRequestEntity.CloseOrderRequestInput, Entity.MutationResponse>(
    OrderRequestController.closeOrderRequest,
  ),
};
