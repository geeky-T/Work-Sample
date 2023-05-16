import KoaRouter from '@koa/router';
import orderReportRoutes from './orderReportRoutes';
import ordersRoutes from './orderRoutes';
import pickRoutes from './pickRoutes';

const WebRouterV1 = new KoaRouter({ prefix: '/api/v1' });

WebRouterV1.use(ordersRoutes.routes());
WebRouterV1.use(ordersRoutes.allowedMethods());
WebRouterV1.use(pickRoutes.routes());
WebRouterV1.use(pickRoutes.allowedMethods());
WebRouterV1.use(orderReportRoutes.routes());
WebRouterV1.use(orderReportRoutes.allowedMethods());

export default WebRouterV1;
