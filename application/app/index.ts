import { mongoConnect } from '@connections/mongo';
import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestServiceServer } from '@transport/__grpc/server';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import koaLogger from 'koa-pino-logger';
import requestToCurl from 'koa-request-to-curl';
import CommonRouter from '../transport/rest/common';
import mobileRoutesV1 from '../transport/rest/mobile/v1';
import mobileRoutesV2 from '../transport/rest/mobile/v2';
import WebRouterV1 from '../transport/rest/web/v1';
import WebRouterV2 from '../transport/rest/web/v2';
import { authMiddleware } from './middlewares/authentication.middleware';
import { setRequestContext } from './middlewares/bindRequestContext.middleware';
import { logCurlRequest } from './middlewares/curlLogger.middleware';
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware';
import { initializeAsyncLocalStorage } from './middlewares/initialiseAsyncLocalStorage.middleware';

class App {
  public app: Koa<Koa.DefaultState, Koa.DefaultContext>;

  loadGRPC(): void {
    OrderRequestServiceServer.start();
  }

  constructor() {
    this.app = new Koa();
  }

  async initializeMongo(): Promise<void> {
    await mongoConnect();
    this.listen();
  }

  loadRoutes(): void {
    this.app.use(CommonRouter.routes());
    this.app.use(CommonRouter.allowedMethods());
    this.app.use(mobileRoutesV1.routes());
    this.app.use(mobileRoutesV1.allowedMethods());
    this.app.use(mobileRoutesV2.routes());
    this.app.use(mobileRoutesV2.allowedMethods());
    this.app.use(WebRouterV1.routes());
    this.app.use(WebRouterV1.allowedMethods());
    this.app.use(WebRouterV2.routes());
    this.app.use(WebRouterV2.allowedMethods());
  }

  loadMiddlewares(): void {
    this.app.use(koaLogger()); // koaLogger middleware to log requests
    this.app.use(bodyParser({ jsonLimit: '10mb' }));
    this.app.use(requestToCurl());
    this.app.use(logCurlRequest);
    this.app.use(errorHandlingMiddleware);
    this.app.use(initializeAsyncLocalStorage);
    this.app.use(setRequestContext());
    this.app.use(authMiddleware);
  }

  async initializeApp(): Promise<void> {
    this.loadMiddlewares();
    this.loadRoutes();
    await this.initializeMongo();
    await this.loadGRPC();
  }

  listen(): void {
    this.app.listen(process.env.HTTP_PORT, () => {
      logger.info(`Server connected to port: ${process.env.HTTP_PORT}`);
    });
  }
}

export default new App();
