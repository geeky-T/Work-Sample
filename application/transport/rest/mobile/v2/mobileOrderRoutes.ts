import KoaRouter from '@koa/router';
import {
  returnOrderRequestItemsHandler,
  updateOrderRequestItemStatusByOrderRequestIdHandler,
} from '../../__routeHandlers/orderRequestItemRoutes.handler';
import {
  createOrderRequestHandler,
  deleteOrderRequestHandler,
  getExpandedOrderRequestHandler,
  getPaginatedExpandedOrderRequestsHandler,
  updateOrderRequestHandler,
} from '../../__routeHandlers/orderRequestRoutes.handler';

export const mobileOrderRoutes = new KoaRouter({ prefix: '/order' });
export const mobileOrdersRoutes = new KoaRouter({ prefix: '/orders' });

/** Order routes */
/** Queries */
mobileOrderRoutes.get('/:orderRequestId', getExpandedOrderRequestHandler);
/** Mutations */
mobileOrderRoutes.post('/', createOrderRequestHandler);

mobileOrderRoutes.put('/:orderRequestId', updateOrderRequestHandler);

mobileOrderRoutes.delete('/:orderRequestId', deleteOrderRequestHandler);

mobileOrderRoutes.put(
  '/:orderRequestId/item/:orderRequestItemId/status',
  updateOrderRequestItemStatusByOrderRequestIdHandler,
);

mobileOrderRoutes.post('/:orderRequestId/return', returnOrderRequestItemsHandler);

/** Orders routes */
/** Queries */
mobileOrdersRoutes.post('/', getPaginatedExpandedOrderRequestsHandler);
