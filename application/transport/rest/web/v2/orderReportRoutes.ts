/* eslint-disable no-param-reassign */
import KoaRouter from '@koa/router';
import { getOrderRequestsReport, getReportOrderRequestCodes } from '../../__routeHandlers/orderRequestRoutes.handler';

const ordersReportRoutes = new KoaRouter({ prefix: '/report' });

// Queries
ordersReportRoutes.post('/orders', getOrderRequestsReport);

ordersReportRoutes.get('/orders/orderIds', getReportOrderRequestCodes);

export default ordersReportRoutes;
