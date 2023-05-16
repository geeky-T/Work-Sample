import KoaRouter from '@koa/router';
import orderReportRoutes from './orderReportRoutes';
import { orderRoutes, ordersRoutes } from './orderRoutes';
import pickRoutes from './pickRoutes';

const WebRouterV2 = new KoaRouter({ prefix: '/api/v2' });

WebRouterV2.use(ordersRoutes.routes());
WebRouterV2.use(ordersRoutes.allowedMethods());
WebRouterV2.use(orderRoutes.routes());
WebRouterV2.use(orderRoutes.allowedMethods());
WebRouterV2.use(pickRoutes.routes());
WebRouterV2.use(pickRoutes.allowedMethods());
WebRouterV2.use(orderReportRoutes.routes());
WebRouterV2.use(orderReportRoutes.allowedMethods());

export default WebRouterV2;
