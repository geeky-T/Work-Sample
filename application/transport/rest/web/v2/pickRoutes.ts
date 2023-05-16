/* eslint-disable no-param-reassign */
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import KoaRouter from '@koa/router';
import { DefaultContext, ParameterizedContext } from 'koa';

const pickRoutes = new KoaRouter({ prefix: '/pick' });
// const PickRouteHandlers = require('../routeHandlers/pickRouteHandlers');

pickRoutes.post(
  '/:orderRequestId/blockOrder',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, string>) => {
    context.status = 404;
    context.body = 'Pick function is disabled for the web app. Please use the mobile app to Pick and Pack.';
  },
);

pickRoutes.post(
  '/:orderRequestId/unBlockOrder',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, string>) => {
    context.status = 404;
    context.body = 'Pick function is disabled for the web app. Please use the mobile app to Pick and Pack.';
  },
);

/** Get order items with location and availability details. */
pickRoutes.get(
  '/:orderRequestId/:siteId',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, string>) => {
    context.status = 404;
    context.body = 'Pick function is disabled for the web app. Please use the mobile app to Pick and Pack.';
  },
);

pickRoutes.post(
  '/:orderRequestId/:siteId',
  async (context: ParameterizedContext<CustomContextState, DefaultContext, string>) => {
    context.status = 404;
    context.body = 'Pick function is disabled for the web app. Please use the mobile app to Pick and Pack.';
  },
);

// /**
//  * Blocks the order with orderId and gets all the sites of items in the order request with status open.
//  */
// pickRoutes.post('/:orderId/blockOrder', PickRouteHandlers.blockOrderAndGetSitesOfOpenItems);

// /** Updates the blockedStatus with updated blockExpiresAt by adding extra 15 minutes from the current time. */
// /** Unexposed as current requirement does not need. */
// // pickRoutes.post('/:orderId/extendBlockTimer', PickRouteHandlers.extendBlockTimerOfOrder);

// /** Unblocks the blocked order. */
// pickRoutes.post('/:orderId/unBlockOrder', PickRouteHandlers.unBlockOrder);

// /** Get order items with location and availability details. */
// pickRoutes.get('/:orderId/:siteId', PickRouteHandlers.getOrderWithItemsLocation);

// /** Creates PickList. */
// pickRoutes.post('/:orderId/:siteId', PickRouteHandlers.createPickList);

export default pickRoutes;
