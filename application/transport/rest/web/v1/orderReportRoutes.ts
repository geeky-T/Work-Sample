/* eslint-disable no-param-reassign */
import KoaRouter from '@koa/router';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, ParameterizedContext } from 'koa';
import { HTTPErrorResponseType } from '../../../../types/HTTPErrorResponse';
import { CustomContextState } from '../../../../types/KoaLibraryTypes';
import { GetOrderRequestsReportInput } from '../../../../types/OrderRequestReport';
import { transformOrderRequestV2toV1 } from '../../__helpers/transformers';
import { getOrderRequestsReport, getReportOrderRequestCodes } from '../../__routeHandlers/orderRequestRoutes.handler';

const ordersReportRoutes = new KoaRouter({ prefix: '/report' });

// Queries
ordersReportRoutes.post(
  '/orders',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      Array<OrderRequestEntity.ExpandedOrderRequestType> | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    const {
      request: { body },
    } = context;
    const transformedBody: GetOrderRequestsReportInput = {
      billToSiteIds: body.billTo,
      categoryIds: body.category,
      createdByIds: body.users,
      deliverToIds: body.users,
      departmentIds: body.departments,
      destinationSiteIds: body.shipTo,
      fulfillingSiteIds: body.fromSite,
      orderItemStatuses: body.orderItemStatus,
      orderRequestCodes: body.orderIds,
      orderRequestDateEnd: body.orEndDate,
      orderRequestDateStart: body.orStartDate,
      orderRequestDateType: body.orderRequestDateType,
      orderRequestDueDateEnd: body.endDueDate,
      orderRequestDueDateStart: body.startDueDate,
      orderRequestDueDateType: body.dueDateType,
      orderRequestStatuses: body.orderStatus,
      projectIds: body.projects,
      skus: body.sku,
      sortDirection: body.sortBy,
    };
    context.request.body = transformedBody;
    await getOrderRequestsReport(context);
    if (context.status === 200) {
      const orderRequests = context.body as Array<OrderRequestEntity.ExpandedOrderRequestType>;
      context.body = orderRequests.map((orderRequest) => transformOrderRequestV2toV1(orderRequest));
    }
  },
);

ordersReportRoutes.get(
  '/orders/orderIds',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      Array<{ order_request_code: OrderRequestEntity.OrderRequestSchema['orderRequestCode'] }> | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    await getReportOrderRequestCodes(context as any);
    if (context.status === 200) {
      context.body = (context.body as Array<OrderRequestEntity.OrderRequestSchema['orderRequestCode']>).map(
        (orderRequestCode) => ({ order_request_code: orderRequestCode }),
      );
    }
  },
);

export default ordersReportRoutes;
