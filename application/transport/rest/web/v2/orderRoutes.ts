import KoaRouter from '@koa/router';
import {
  resendReturnedOrderRequestItemEmailHandler,
  returnOrderRequestItemsHandler,
  updateOrderRequestItemStatusByOrderRequestIdHandler,
} from '../../__routeHandlers/orderRequestItemRoutes.handler';
import {
  createOrderRequestHandler,
  deleteOrderRequestHandler,
  getExpandedOrderRequestHandler,
  getPaginatedExpandedOrderRequestsHandler,
  sendOrderReadyForPickUpNotificationRouter,
  updateOrderRequestHandler,
} from '../../__routeHandlers/orderRequestRoutes.handler';

export const ordersRoutes = new KoaRouter({ prefix: '/orders' });
export const orderRoutes = new KoaRouter({ prefix: '/order' });

/* Orders routes */
/* Queries */
ordersRoutes.get('/', getPaginatedExpandedOrderRequestsHandler);
ordersRoutes.post('/', getPaginatedExpandedOrderRequestsHandler);

/* Order routes */
/* Queries */
orderRoutes.get('/:orderRequestId', getExpandedOrderRequestHandler);
/* Mutations */
orderRoutes.post('/', createOrderRequestHandler);
orderRoutes.put('/:orderRequestId', updateOrderRequestHandler);
orderRoutes.delete('/:orderRequestId', deleteOrderRequestHandler);

orderRoutes.get('/:orderRequestId/:orderRequestItemId/return/email', resendReturnedOrderRequestItemEmailHandler);
orderRoutes.put('/:orderRequestId/item/:orderRequestItemId/status', updateOrderRequestItemStatusByOrderRequestIdHandler);
orderRoutes.post('/:orderRequestId/return', returnOrderRequestItemsHandler);


orderRoutes.post('/sendOrderReadyForPickUpNotificationRouter', sendOrderReadyForPickUpNotificationRouter);

export default ordersRoutes;
