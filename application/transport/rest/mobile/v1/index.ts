import KoaRouter from '@koa/router';
import mobileOrderRoutes from './mobileOrderRoutes';
import mobilePickRoutes from './mobilePickRoutes';

const mobileRoutesV1 = new KoaRouter({ prefix: '/api/mobile/v1' });

mobileRoutesV1.use(mobileOrderRoutes.routes());
mobileRoutesV1.use(mobileOrderRoutes.allowedMethods());
mobileRoutesV1.use(mobilePickRoutes.routes());
mobileRoutesV1.use(mobilePickRoutes.allowedMethods());

export default mobileRoutesV1;
