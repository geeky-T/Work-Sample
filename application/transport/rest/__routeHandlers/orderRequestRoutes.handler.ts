/* eslint-disable no-param-reassign */
import { OrderRequestController } from '@controllers/orderRequest/orderRequest.controller';
import { HTTPErrorResponseType } from '@custom-types/HTTPErrorResponse';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import { logger } from '@procurenetworks/backend-utils';
import { Entity, OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { EmailService } from '@services/externals/EmailServiceV3';
import { OrderRequestServiceV2 } from '../../../services/orderRequest/orderRequest.service';
import { expandOrderEntities } from '@utils/expandOrderEntities';
import { contextUserUtil } from '@utils/userAuthentication/contextUser.util';
import { DefaultContext, ParameterizedContext } from 'koa';
import { HTTPSuccessResponseType } from '../../../types/HTTPSuccessResponse';
import { OrderRequestItemServiceV2 } from '../../../services/orderRequestItem/orderRequestItem.service';



/* Queries */
export const getPaginatedExpandedOrderRequestsHandler = async (
  context: ParameterizedContext<
    CustomContextState,
    DefaultContext,
    OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload | HTTPErrorResponseType
  >,
): Promise<void> => {
  try {
    const {
      request: { body: queryParameters },
      state: { userContext },
    } = context;
    const getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput = {
      filters: queryParameters as OrderRequestEntity.OrderRequestFilters,
      paginationProps: {
        limit: Number(queryParameters.limit) || 10,
        skip: Number(queryParameters.skip) || 0,
        sortField: queryParameters.sortField as string,
        sortOrder: queryParameters.sortOrder as Entity.SortOrderEnum,
      },
    };
    const paginatedOrderRequests =
      await OrderRequestController.getPaginatedExpandedOrderRequestsBasedOnAccessLevelDeprecated(
        getPaginatedOrderRequestsInput,
        userContext,
      );
    context.body = paginatedOrderRequests;
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in getPaginatedOrderRequestsHandler' });
    throw error;
  }
};

export const getExpandedOrderRequestHandler = async (
  context: ParameterizedContext<
    CustomContextState,
    DefaultContext,
    OrderRequestEntity.ExpandedOrderRequestType | HTTPErrorResponseType
  >,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const orderRequests = await OrderRequestController.getExpandedOrderRequest(
      { filters: { orderRequestIds: [orderRequestId] } },
      userContext,
    );
    context.body = orderRequests;
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in getPaginatedOrderRequestsHandler' });
    throw error;
  }
};

export const getOrderRequestsReport = async (
  context: ParameterizedContext<
    CustomContextState,
    DefaultContext,
    Array<OrderRequestEntity.ExpandedOrderRequestType> | HTTPErrorResponseType
  >,
) => {
  try {
    const {
      request: { body },
      state: { userContext },
    } = context;
    context.body = await OrderRequestController.getOrderRequestsReport(body, userContext);
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in getOrderRequestsReport' });
    if (!error.status) {
      error.status = (error.response && error.response.status) || 500;
    }
    context.status = error.status;
    context.body =
      error.response && error.response.data ? { errorMessage: error.response.data } : { errorMessage: error.message };
  }
};

export const getReportOrderRequestCodes = async (
  context: ParameterizedContext<
    CustomContextState,
    DefaultContext,
    Array<OrderRequestEntity.OrderRequestSchema['orderRequestCode']> | HTTPErrorResponseType
  >,
) => {
  try {
    const {
      state: { userContext },
    } = context;
    context.body = await OrderRequestController.getReportOrderRequestCodes(userContext);
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in getReportOrderRequestCodes' });
    if (!error.status) {
      error.status = (error.response && error.response.status) || 500;
    }
    context.status = error.status;
    context.body =
      error.response && error.response.data ? { errorMessage: error.response.data } : { errorMessage: error.message };
  }
};

/* Mutations */

export const createOrderRequestHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      state: { userContext },
    } = context;
    const requestPayload = body as OrderRequestEntity.CreateOrderRequestInput;
    await OrderRequestController.createOrderRequest(requestPayload, userContext);
    context.status = 201;
    context.body = {
      success: true,
      message: 'Order Request created successfully.',
    };
  } catch (error: any) {
    logger.error({ error, message: 'Error in createOrderRequestHandler' });
    throw error;
  }
};

export const deleteOrderRequestHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestEntity.DeleteOrderRequestInput = {
      orderRequestId,
    };
    await OrderRequestController.deleteOrderRequest(requestPayload, userContext);
    context.body = {
      success: true,
      message: 'Order Request deleted successfully.',
    };
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in deleteOrderRequestHandler' });
    throw error;
  }
};

export const updateOrderRequestHandler = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      params: { orderRequestId },
      state: { userContext },
    } = context;
    const requestPayload: OrderRequestEntity.UpdateOrderRequestInput = {
      orderRequestId,
      updates: body as OrderRequestEntity.ExpandedOrderRequestType,
    };
    context.body = {
      success: true,
      message: 'Order Request updated successfully.',
    };
    await OrderRequestController.updateOrderRequest(requestPayload, userContext);
    context.status = 200;
  } catch (error: any) {
    logger.error({ error, message: 'Error in updateOrderRequestHandler' });
    throw error;
  }
};


// kept this for testing purpose
export const sendOrderReadyForPickUpNotificationRouter = async (
  context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
): Promise<void> => {
  try {
    const {
      request: { body },
      state: { userContext },
    } = context;

    const tenantId = '6448ac8216f6f2452383a45f';
    const orderRequestId = '6448b55a0a7ac9059f11d4fe';
    const orderRequestItemId = '6448b55a0a7ac9059f11d502';

    const effectiveChildContext = contextUserUtil.switchTenantForInternalUsage(userContext, tenantId);


    const { orderRequests } = await OrderRequestServiceV2.getAllOrderRequests(
      { filters: { orderRequestIds: [orderRequestId] } },
      effectiveChildContext,
    );
    const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems({ filters: { orderRequestItemIds: [orderRequestItemId] } }, effectiveChildContext);



    const [orderRequestInChildTenant] = orderRequests;
    const [childOrderRequestItemsCreated] = orderRequestItems;

    const [pickListEmailPayload] = await expandOrderEntities(
      [{ orderRequest: orderRequestInChildTenant, orderRequestItems: [childOrderRequestItemsCreated] }],
      effectiveChildContext,
    );

    await EmailService.sendOrderReadyForPickUpNotification(pickListEmailPayload, userContext);
  } catch (error: any) {
    logger.error({ error, message: 'Error in createOrderRequestHandler' });
    throw error;
  }
};