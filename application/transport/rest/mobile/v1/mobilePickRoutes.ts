/* eslint-disable no-param-reassign */
import { HTTPErrorResponseType } from '@custom-types/HTTPErrorResponse';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import KoaRouter from '@koa/router';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import {
  blockOrderRequestAndGetOpenOrderRequestItemHandler,
  createPickListHandler,
  extendBlockTimerOfOrderRequestHandler,
  getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteHandler,
  unblockOrderRequestHandler,
} from '@transport/rest/__routeHandlers/pickRoutes.handler';
import { DefaultContext, ParameterizedContext } from 'koa';
import { transformOrderRequestV2toV1 } from '../../__helpers/transformers';

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
pickRoutes.get(
  '/:orderRequestId/:siteId',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASitePayload | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    await getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteHandler(context);
    if (context.status === 200) {
      context.body = transformOrderRequestV2toV1(context.body as OrderRequestEntity.ExpandedOrderRequestType);
    }
  },
);

/** Creates PickList. */
pickRoutes.post('/:orderRequestId/:siteId', createPickListHandler);

export default pickRoutes;
