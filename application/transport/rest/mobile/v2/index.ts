import KoaRouter from '@koa/router';
import { mobileOrderRoutes, mobileOrdersRoutes } from './mobileOrderRoutes';
import mobilePickRoutes from './mobilePickRoutes';

const mobileRoutesV2 = new KoaRouter({ prefix: '/api/mobile/v2' });

mobileRoutesV2.use(mobileOrderRoutes.routes());
mobileRoutesV2.use(mobileOrderRoutes.allowedMethods());
mobileRoutesV2.use(mobileOrdersRoutes.routes());
mobileRoutesV2.use(mobileOrdersRoutes.allowedMethods());
mobileRoutesV2.use(mobilePickRoutes.routes());
mobileRoutesV2.use(mobilePickRoutes.allowedMethods());

export default mobileRoutesV2;
