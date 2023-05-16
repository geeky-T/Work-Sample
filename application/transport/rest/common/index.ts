import KoaRouter from '@koa/router';
import coreRoutes from '../common/coreServiceRoutes';
import healthRoutes from '../common/healthRoutes';
import inventoryRoutes from '../common/inventoryRoutes';

const CommonRouter = new KoaRouter({ prefix: '/api' });

CommonRouter.use(healthRoutes.routes());
CommonRouter.use(healthRoutes.allowedMethods());
CommonRouter.use(coreRoutes.routes());
CommonRouter.use(coreRoutes.allowedMethods());
CommonRouter.use(inventoryRoutes.routes());
CommonRouter.use(inventoryRoutes.allowedMethods());

export default CommonRouter;
