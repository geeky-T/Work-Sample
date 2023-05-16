import { OrderRequestItemController } from '@controllers/orderRequestItem/orderRequestItem.controller';
import { Entity, OrderRequestItemEntity, serviceRequest } from '@procurenetworks/inter-service-contracts';

export const OrderRequestItemQueries = {
  getAllOrderRequestItems: serviceRequest<
    OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    OrderRequestItemEntity.GetAllOrderRequestItemsPayload
  >(OrderRequestItemController.getAllOrderRequestItems),
  getOrderRequestItemsByIdsAcrossTenants: serviceRequest<
    OrderRequestItemEntity.GetOrderRequestItemsByIdsAcrossTenantsInput,
    OrderRequestItemEntity.GetAllOrderRequestItemsPayload
  >(OrderRequestItemController.getOrderRequestItemsByIdsAcrossTenants),
  getOrderRequestItemsByOrderRequestIdsAcrossTenants: serviceRequest<
    OrderRequestItemEntity.GetOrderRequestItemsByOrderRequestIdsAcrossTenantsInput,
    OrderRequestItemEntity.GetAllOrderRequestItemsPayload
  >(OrderRequestItemController.getOrderRequestItemsByOrderRequestIdsAcrossTenants),
};

export const OrderRequestItemMutations = {
  deleteOrderRequestItemsByItemIds: serviceRequest<
    OrderRequestItemEntity.DeleteOrderRequestItemsByItemIdsInput,
    Entity.MutationResponse
  >(OrderRequestItemController.deleteOrderRequestItemsByItemIds),
  unpackOrderRequestItemsOfTrackingIds: serviceRequest<
    OrderRequestItemEntity.UnpackOrderRequestItemsOfTrackingIdsInput,
    Entity.MutationResponse
  >(OrderRequestItemController.unpackOrderRequestItemsOfTrackingIds),
  updateOrderRequestItemsStatusByTrackingUpdates: serviceRequest<
    OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput,
    Entity.MutationResponse
  >(OrderRequestItemController.updateOrderRequestItemsStatusByTrackingUpdates),
  updateOrderRequestItemsStatusByItemRestockUpdates: serviceRequest<
    OrderRequestItemEntity.UpdateOrderRequestItemsStatusByItemRestockUpdatesInput,
    Entity.MutationResponse
  >(OrderRequestItemController.updateOrderRequestItemsStatusByItemRestockUpdates),
};
