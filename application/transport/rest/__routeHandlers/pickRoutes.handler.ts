/* eslint-disable no-param-reassign */
import { OrderRequestController } from '@controllers/orderRequest/orderRequest.controller';
import { PickListController } from '@controllers/pickList/pickList.controller';
import { HTTPErrorResponseType } from '@custom-types/HTTPErrorResponse';
import { MinimalSiteResponseType } from '@custom-types/InventoryTypes/response';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestEntity, PickListEntity } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, ParameterizedContext } from 'koa';
import { HTTPSuccessResponseType } from '../../../types/HTTPSuccessResponse';

/* Queries */
export const getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteHandler = async (
  context: ParameterizedContext<
    CustomContextState,
    DefaultContext,
    OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASitePayload | HTTPErrorResponseType
  >,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId, siteId },
      state: { userContext },
    } = context;
    context.body = await OrderRequestController.getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASite(
      { orderRequestId, siteId },
      userContext,
    );
    context.status = 200;
  } catch (error: any) {
    logger.error({
      error,
      message: 'Error in getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASite',
    });
    throw error;
  }
};

/* Mutations */
export const blockOrderRequestAndGetOpenOrderRequestItemHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, MinimalSiteResponseType[] | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestEntity.BlockOrderRequestInput = {
      orderRequestId,
    };
    context.body = await OrderRequestController.blockOrderRequestAndGetOpenOrderRequestItem(requestPayload, userContext);
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in blockOrderRequestAndGetOpenOrderRequestHandler' });
    throw error;
  }
};

export const createPickListHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      params: { orderRequestId, siteId },
      state: { userContext },
    } = context;
    const requestPayload: PickListEntity.CreatePickListInput = {
      items: body as PickListEntity.CreatePickListItemInput[],
      orderRequestId,
      siteId,
    };
    await PickListController.createPickList(requestPayload, userContext);
    context.status = 201;
    context.body = {
      success: true,
      message: 'Pick list created successfully.',
    };
  } catch (error: any) {
    logger.error({ error, message: 'Error in createPickList' });
    throw error;
  }
};

export const extendBlockTimerOfOrderRequestHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestEntity.BlockOrderRequestInput = {
      orderRequestId,
    };
    const { success } = await OrderRequestController.extendBlockTimerOfOrderRequest(requestPayload, userContext);
    context.body = {
      success,
      message: 'Extended block time for Order Request successfully.',
    };
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in extendBlockTimerOfOrderRequest' });
    throw error;
  }
};

export const unblockOrderRequestHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestEntity.UnblockOrderRequestInput = {
      orderRequestId,
    };
    const { success } = await OrderRequestController.unblockOrderRequest(requestPayload, userContext);
    context.body = {
      success,
      message: 'Unblocked Order Request successfully.',
    };
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in unblockOrderRequestHandler' });
    throw error;
  }
};
