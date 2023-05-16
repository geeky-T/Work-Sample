import KoaRouter from '@koa/router';
import {
  blockOrderRequestAndGetOpenOrderRequestItemHandler,
  createPickListHandler,
  extendBlockTimerOfOrderRequestHandler,
  getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteHandler,
  unblockOrderRequestHandler,
} from '@transport/rest/__routeHandlers/pickRoutes.handler';

const pickRoutes = new KoaRouter({ prefix: '/pick' });

/**
 * Blocks the order with orderId and gets all the sites of items in the order request with status open.
 */
pickRoutes.post('/:orderRequestId/blockOrder', blockOrderRequestAndGetOpenOrderRequestItemHandler);

/** Updates the blockedStatus with updated blockExpiresAt by adding extra 15 minutes from the current time. */
/** Unexposed as current requirement does not need. */
pickRoutes.post('/:orderRequestId/extendBlockTimer', extendBlockTimerOfOrderRequestHandler);

/** Unblocks the blocked order. */
pickRoutes.post('/:orderRequestId/unBlockOrder', unblockOrderRequestHandler);

/** Get order items with location and availability details. */
pickRoutes.get('/:orderRequestId/:siteId', getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteHandler);

/** Creates PickList. */
pickRoutes.post('/:orderRequestId/:siteId', createPickListHandler);

export default pickRoutes;
