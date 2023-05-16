/* eslint-disable no-param-reassign */
import { HTTPErrorResponseType } from '@custom-types/HTTPErrorResponse';
import { CustomContextState } from '@custom-types/KoaLibraryTypes';
import KoaRouter from '@koa/router';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, ParameterizedContext } from 'koa';
import { HTTPSuccessResponseType } from '../../../../types/HTTPSuccessResponse';
import { transformOrderRequestV2toV1, transformPaginatedOrderRequestPayload } from '../../__helpers/transformers';
import {
  returnOrderRequestItemsHandler,
  updateOrderRequestItemStatusByOrderRequestIdHandler,
} from '../../__routeHandlers/orderRequestItemRoutes.handler';
import {
  createOrderRequestHandler,
  deleteOrderRequestHandler,
  getExpandedOrderRequestHandler,
  getPaginatedExpandedOrderRequestsHandler,
  updateOrderRequestHandler,
} from '../../__routeHandlers/orderRequestRoutes.handler';

const ordersRoutes = new KoaRouter({ prefix: '/orders' });

// Queries
ordersRoutes.get(
  '/',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    const {
      request: { query: queryParameters },
    } = context;
    context.request.body = {};
    if (
      queryParameters.order_status &&
      [OrderRequestEntity.OrderRequestStatusEnum.ACTIVE, OrderRequestEntity.OrderRequestStatusEnum.CLOSED].includes(
        queryParameters.order_status as OrderRequestEntity.OrderRequestStatusEnum,
      )
    ) {
      context.request.body.statuses = [queryParameters.order_status];
    }
    if (queryParameters.skip) {
      context.request.body.skip = queryParameters.skip;
    }
    if (queryParameters.limit) {
      context.request.body.limit = queryParameters.limit;
    }
    if (queryParameters.pickableOrders) {
      context.request.body.pickableOrders = queryParameters.pickableOrders;
    }
    if (queryParameters.order_by) {
      context.request.body.sortField = queryParameters.order_by;
    }
    if (queryParameters.order_dir) {
      context.request.body.pickableOrders = queryParameters.order_dir;
    }
    if (queryParameters.search) {
      context.request.body.search = queryParameters.search;
    }
    if (queryParameters.availableAtSiteIds) {
      context.request.body.availableAtSiteIds = queryParameters.availableAtSiteIds;
    }
    await getPaginatedExpandedOrderRequestsHandler(context);
    if (context.status === 200) {
      context.body = transformPaginatedOrderRequestPayload(
        context.body as OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload,
      );
    }
  },
);

ordersRoutes.get(
  '/:orderRequestId',
  async (
    context: ParameterizedContext<
      CustomContextState,
      DefaultContext,
      OrderRequestEntity.ExpandedOrderRequestType | HTTPErrorResponseType
    >,
  ): Promise<void> => {
    await getExpandedOrderRequestHandler(context);
    if (context.status === 200) {
      context.body = transformOrderRequestV2toV1(context.body as OrderRequestEntity.ExpandedOrderRequestType);
    }
  },
);

// Mutations
ordersRoutes.post(
  '/',
  async (
    context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
  ): Promise<void> => {
    const {
      request: { body },
    } = context;
    const transformedBody: OrderRequestEntity.CreateOrderRequestInput = {
      type: body.type || OrderRequestEntity.OrderRequestTypeEnum.INTERNAL,
      billToSiteId: body.bill_to,
      deliverToId: body.deliver_to,
      departmentId: body.department_id,
      destinationSiteId: body.ship_to,
      dueDate: body.due_date,
      items: body.items.map((item: any) => ({
        categoryId: item.category_id,
        cost: item.cost,
        description: item.description,
        imageUrl: item.image_url,
        itemId: item.id,
        projectId: item.project_id,
        quantity: item.quantity,
        sku: item.sku,
        title: item.title,
        upcCode: item.upc_code,
        website: item.website,
      })),
    };
    context.request.body = transformedBody;
    await createOrderRequestHandler(context);
    if (context.status === 200) {
      context.body = transformPaginatedOrderRequestPayload(
        context.body as OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload,
      );
    }
  },
);

ordersRoutes.put(
  '/:orderRequestId',
  async (
    context: ParameterizedContext<CustomContextState, DefaultContext, HTTPSuccessResponseType | HTTPErrorResponseType>,
  ): Promise<void> => {
    const {
      request: { body },
    } = context;
    context.request.body = {
      availableAtSiteIds: body.availableAtSiteIds,
      billToSiteId: body.bill_to,
      blockedStatus: body.blockedStatus,
      createdById: body.created_by,
      deletedAt: body.deleted_at,
      deletedById: body.deleted_by,
      deliverToId: body.deliver_to,
      departmentId: body.department_id,
      destinationSiteId: body.ship_to,
      dueDate: body.due_date,
      fulfillingSites: body.fulfillingSites,
      leastItemStatus: body.leastItemStatus,
      orderRequestCode: body.order_request_code,
      scheduleId: body.scheduleId,
      searchTerms: body.searchTerms,
      status: body.status,
      tenantId: body.tenant_id,
      updatedById: body.updated_by,
      billToSiteName: body.bill_to_name,
      requestor: body.requestor,
      departmentName: body.department_name,
      recipient: body.recipient,
      destinationSiteName: body.ship_to_name,
      items: body?.items?.map((item: any) => ({
        categoryId: item.category_id,
        cost: item.cost,
        createdById: item.created_by,
        description: item.description,
        identificationHistory: item.identificationHistory || [],
        imageUrl: item.image_url,
        itemId: item.item_id,
        nonRemovableNotes: item.nonRemovableNotes,
        note: item.note,
        orderRequestId: item.order_request_id,
        projectId: item.project_id,
        quantity: item.quantity,
        sku: item.sku,
        status: item.status,
        statusHistory: item.status_history,
        tenantId: item.tenantId,
        title: item.title,
        type: item.type,
        upcCode: item.upc_code,
        updatedById: item.updated_by,
        website: item.website,
        isEdited: item.isEdited || false,
      })),
    } as OrderRequestEntity.ExpandedOrderRequestType;
    await updateOrderRequestHandler(context);
  },
);

ordersRoutes.delete('/:orderRequestId', deleteOrderRequestHandler);

ordersRoutes.put('/:orderRequestId/item/:orderRequestItemId/status', updateOrderRequestItemStatusByOrderRequestIdHandler);

ordersRoutes.post('/:orderRequestId/return', returnOrderRequestItemsHandler);

export default ordersRoutes;
