/* eslint-disable no-param-reassign */
import { OrderRequestItemController } from '@controllers/orderRequestItem/orderRequestItem.controller';
import { HTTPErrorResponseType } from '@custom-types/HTTPErrorResponse';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, ParameterizedContext } from 'koa';
import { HTTPSuccessResponseType } from '../../../types/HTTPSuccessResponse';

export const resendReturnedOrderRequestItemEmailHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId, orderRequestItemId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestItemEntity.ResendReturnedOrderRequestItemEmailInput = {
      orderRequestId,
      orderRequestItemId,
    };
    await OrderRequestItemController.resendReturnedOrderRequestItemEmail(requestPayload, userContext);
    context.status = 200;
    context.body = {
      success: true,
      message: 'Email sent successfully.',
    };
  } catch (error: any) {
    logger.error({ error, message: 'Error in updateOrderRequestHandler' });
    throw error;
  }
};

export const returnOrderRequestItemsHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestItemEntity.ReturnOrderRequestItemsInput = {
      orderRequestId,
      returnedOrderRequestItems: body as OrderRequestItemEntity.ReturnedOrderRequestItemDetails[],
    };
    await OrderRequestItemController.returnOrderRequestItems(requestPayload, userContext);
    context.body = {
      success: true,
      message: 'Order Request items returned successfully.',
    };
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in updateOrderRequestHandler' });
    throw error;
  }
};

export const updateOrderRequestItemStatusByOrderRequestIdHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      params: { orderRequestId, orderRequestItemId },
      state: { userContext },
    } = context;
    const requestPayload = {
      orderRequestId,
      orderRequestItemId,
      ...(body as { status: OrderRequestItemEntity.OrderRequestItemStatusEnum; notes: string }),
    } as OrderRequestItemEntity.UpdateOrderRequestItemStatusByOrderRequestIdInput;
    await OrderRequestItemController.updateOrderRequestItemStatusByOrderRequestId(requestPayload, userContext);
    context.body = {
      success: true,
      message: 'Order Request Item status updated successfully.',
    };
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in updateOrderRequestHandler' });
    throw error;
  }
};
