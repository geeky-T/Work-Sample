import { ExpandOrderEntitiesInput } from '@custom-types/common';
import { OrderRequestRepository } from '@models/orderRequest/orderRequest.repository';
import {
  ForbiddenError,
  InternalServerError,
  logger,
  ProcureError,
  ResourceNotFoundError,
  ValidationError,
} from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { EmailService } from '@services/externals/EmailServiceV3';
import { OrderRequestItemServiceV2 } from '@services/orderRequestItem/orderRequestItem.service';
import { expandOrderEntities } from '@utils/expandOrderEntities';
import { PaginationUtils } from '@utils/pagination.util';
import { groupBy, omit } from 'lodash';
import mongoose, { ClientSession } from 'mongoose';
import { GetOrderRequestsReportInput } from '../../types/OrderRequestReport';
import { contextUserUtil } from '../../utils/userAuthentication/contextUser.util';
import { PermissionValidator } from '../../utils/validators/orderRequestPermission.validator';
import InventoryService from '../externals/InventoryService';
import { parseCreateOrderRequestInput } from './helpers/createOrderRequest.helper';
import {
  duplicateAndGetItemsInChildTenant,
  getSiteIdOfPartnerTenant,
  parseCreateExternalOrderRequestInputForChildTenant,
  parseCreateExternalOrderRequestInputForParentTenant,
} from './helpers/externalOrderRequest.helper';
import {
  validateBlockOrderRequest,
  validateCreateOrderRequestInput,
  validateDeleteOrderRequestInput,
  validateUnblockOrderRequest,
  validateUpdateOrderRequestInput,
} from './helpers/orderRequest.validators';
import {
  checkOrderRequestFilters,
  checkOrderRequestItemFilters,
  sortOrderRequestReports,
  transformOrderReportFilters,
} from './helpers/orderRequestReport.helper';
import { validateOrderReportFilters } from './helpers/orderRequestReport.validators';
import { parseLeastOrderRequestItemStatus } from './helpers/updateLeastItemStatus.helper';
import { parseUpdateOrderRequestInput } from './helpers/updateOrderRequest.helper';

class OrderRequestServiceClass {
  /* Queries */
  async getAllExpandedOrderRequests(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequests(getAllOrderRequestsInput, userContext);
    const orderRequestIds = orderRequests.map((orderRequest) => orderRequest._id);

    if (orderRequestIds.length === 0) {
      return { orderRequests: [] };
    }
    const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
      { filters: { orderRequestIds } },
      userContext,
    );
    const orderRequestItemsByOrderRequestId = groupBy(orderRequestItems, (element) => element.orderRequestId.toString());
    const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequests.map((orderRequest) => ({
      orderRequest,
      orderRequestItems: orderRequestItemsByOrderRequestId[orderRequest._id.toString()],
    }));
    const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
    return { orderRequests: expandedOrderRequests };
  }

  async getOrderRequestsByIdsAcrossTenants(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsPayload> {
    try {
      logger.debug({
        message: 'OrderRequest Service.getOrderRequestsByIdsAcrossTenants',
        payload: { input },
      });
      if (input.filters.orderRequestIds.length === 0) {
        return { orderRequests: [] };
      }

      const orderRequests = await OrderRequestRepository.getAllOrderRequestsAcrossTenants(input, userContext);

      return { orderRequests };
    } catch (error: any) {
      if (error instanceof ProcureError) {
        throw error;
      }
      logger.error({ error, message: `Error in getOrderRequestsByIdsAcrossTenants.` });
      throw new InternalServerError({
        debugMessage: `Failed to getOrderRequestsByIdsAcrossTenants ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { input },
        where: `OrderRequest service - ${this.getOrderRequestsByIdsAcrossTenants.name}`,
      });
    }
  }

  async getExpandedOrderRequestsByIdsAcrossTenants(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequestsAcrossTenants(input, userContext);
    const orderRequestIds = orderRequests.map((orderRequest) => orderRequest._id);

    if (orderRequestIds.length === 0) {
      return { orderRequests: [] };
    }
    const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
      { filters: { orderRequestIds, _exists: { deletedAt: false } }, disableBaseFilter: true },
      userContext,
    );

    const orderRequestItemsByOrderRequestId = groupBy(orderRequestItems, (element) => element.orderRequestId.toString());
    const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequests.map((orderRequest) => ({
      orderRequest,
      orderRequestItems: orderRequestItemsByOrderRequestId[orderRequest._id.toString()],
    }));

    const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
    return { orderRequests: expandedOrderRequests };
  }

  async getExpandedOrderRequestsByIdsAcrossTenantsWithoutItems(
    input: OrderRequestEntity.GetOrderRequestsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetExpandedOrderRequestsByIdsAcrossTenantsWithoutItemsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequestsAcrossTenants(input, userContext);

    const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequests.map((orderRequest) => ({
      orderRequest,
    }));

    const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
    return { orderRequests: expandedOrderRequests };
  }

  async getAllExpandedOrderRequestsWithoutItems(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetAllExpandedOrderRequestsWithoutItemsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequests(getAllOrderRequestsInput, userContext);

    const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequests.map((orderRequest) => ({
      orderRequest,
    }));
    const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
    return { orderRequests: expandedOrderRequests };
  }

  async getAllOrderRequests(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.GetAllOrderRequestsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequests(getAllOrderRequestsInput, userContext, session);
    return { orderRequests };
  }

  async getAllOrderRequestsAcrossTenants(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.GetAllOrderRequestsPayload> {
    const orderRequests = await OrderRequestRepository.getAllOrderRequestsAcrossTenants(
      getAllOrderRequestsInput,
      userContext,
      session,
    );
    return { orderRequests };
  }

  async getOrderRequestForEditing(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    const orderRequest = await OrderRequestRepository.getOrderRequestForAction(
      getAllOrderRequestsInput,
      OrderRequestEntity.OrderRequestActionsEnum.EDIT,
      userContext,
    );
    return orderRequest;
  }

  async getOrderRequestForDelete(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    const orderRequest = await OrderRequestRepository.getOrderRequestForAction(
      getAllOrderRequestsInput,
      OrderRequestEntity.OrderRequestActionsEnum.DELETE,
      userContext,
    );
    return orderRequest;
  }

  async getOrderRequestForReturn(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    const orderRequest = await OrderRequestRepository.getOrderRequestForAction(
      getAllOrderRequestsInput,
      OrderRequestEntity.OrderRequestActionsEnum.RETURN,
      userContext,
    );
    return orderRequest;
  }

  async getExpandedOrderRequest(
    getOrderRequestInput: OrderRequestEntity.GetOrderRequestInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.ExpandedOrderRequestType> {
    const orderRequest = await OrderRequestRepository.getOrderRequest(getOrderRequestInput, userContext);
    if (!orderRequest) {
      throw new ForbiddenError({
        report: false,
        debugMessage: 'Unavailable/Inaccessible order request tried to access.',
        message: 'This order is not available. Please recheck the order or select a different order.',
        params: { getOrderRequestInput },
        where: `${__filename} - ${this.getExpandedOrderRequest.name}`,
      });
    }
    const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
      { filters: { orderRequestIds: [orderRequest?._id] } },
      userContext,
    );
    const [expandedOrderRequest] = await expandOrderEntities([{ orderRequest, orderRequestItems }], userContext);
    return expandedOrderRequest;
  }

  async getDistinctValuesForAllOrderRequests<T extends keyof OrderRequestEntity.OrderRequestSchema>(
    getAllOrderRequestsInput: OrderRequestEntity.GetAllOrderRequestsInput,
    field: T,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema[T][]> {
    return OrderRequestRepository.getDistinctValuesForAllOrderRequests<typeof field>(
      getAllOrderRequestsInput,
      field,
      userContext,
    );
  }

  async getOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASite(
    { orderRequestId, siteId }: OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASiteInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetOpenOrderRequestWithOpenOrderRequestItemsAtLocationsOfASitePayload> {
    /** Check whether the user is authorized to pick and pack */
    await PermissionValidator.verifyOrderRequestPickPermissions(userContext);

    const [{ orderRequests }, openOrderRequestItems] = await Promise.all([
      this.getAllOrderRequests({ filters: { orderRequestIds: [orderRequestId] } }, userContext),
      OrderRequestItemServiceV2.getPickableOrderRequestItemsOfOrderRequest(orderRequestId, userContext),
    ]);

    const [expandedOrderRequest] = await expandOrderEntities(
      [{ orderRequest: orderRequests[0], orderRequestItems: openOrderRequestItems }],
      userContext,
    );

    const itemIds = openOrderRequestItems.map((item) => item.itemId) as StringObjectID[];
    const inventoryAssetItemDetails = await InventoryService.getItemDetailsWithLocation(itemIds, siteId, userContext);
    const orderRequestItemsWithLocation: OrderRequestEntity.OrderRequestItemsWithLocations[] = [];
    expandedOrderRequest.items.forEach((item) => {
      const itemDetail = inventoryAssetItemDetails.find((itemDetails) => itemDetails.sku === item.sku);
      if (!itemDetail || itemDetail.locations.length === 0) {
        return;
      }
      orderRequestItemsWithLocation.push({
        ...item,
        cost: itemDetail.cost ? parseFloat(itemDetail.cost) : 0,
        locations: itemDetail.locations,
      });
    });
    return { ...expandedOrderRequest, items: orderRequestItemsWithLocation };
  }

  async getPaginatedExpandedOrderRequestsDeprecated(
    getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetPaginatedExpandedOrderRequestsPayload> {
    const [orderRequests, orderRequestsCount] = await Promise.all([
      OrderRequestRepository.getPaginatedOrderRequestsDeprecated(getPaginatedOrderRequestsInput, userContext),
      OrderRequestRepository.getOrderRequestsCount(getPaginatedOrderRequestsInput, userContext),
    ]);
    const orderRequestIds = orderRequests.map((orderRequest) => orderRequest._id);

    const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
      { filters: { orderRequestIds } },
      userContext,
    );
    const orderRequestItemsByOrderRequestId = groupBy(orderRequestItems, (element) => element.orderRequestId.toString());
    const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequests.map((orderRequest) => ({
      orderRequest,
      orderRequestItems: orderRequestItemsByOrderRequestId[orderRequest._id.toString()],
    }));
    const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
    return PaginationUtils.getPaginatedEntitiesPayload(
      expandedOrderRequests,
      orderRequestsCount,
      getPaginatedOrderRequestsInput.paginationProps,
    );
  }

  async getPaginatedOrderRequestsDeprecated(
    getPaginatedOrderRequestsInput: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.GetPaginatedOrderRequestsPayload> {
    const [orderRequests, orderRequestsCount] = await Promise.all([
      OrderRequestRepository.getPaginatedOrderRequestsDeprecated(getPaginatedOrderRequestsInput, userContext),
      OrderRequestRepository.getOrderRequestsCount(getPaginatedOrderRequestsInput, userContext),
    ]);

    return PaginationUtils.getPaginatedEntitiesPayload(
      orderRequests,
      orderRequestsCount,
      getPaginatedOrderRequestsInput.paginationProps,
    );
  }

  async getOrderRequestsReport(
    { sortDirection, ...filters }: GetOrderRequestsReportInput,
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.ExpandedOrderRequestType>> {
    try {
      validateOrderReportFilters(filters);
      const transformedFilters = transformOrderReportFilters(filters);
      const hasOrderFilters = checkOrderRequestFilters(transformedFilters);
      const hasOrderItemFilters = checkOrderRequestItemFilters(transformedFilters);
      const orderRequestItemDbFilter = {
        categoryIds: transformedFilters.categoryIds,
        projectIds: transformedFilters.projectIds,
        skus: transformedFilters.skus,
        statuses: transformedFilters.orderItemStatuses,
        itemIds: transformedFilters.itemIds,
      };
      let orderRequestsForReport: Array<OrderRequestEntity.OrderRequestSchema> = [];
      let orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[];

      if (hasOrderFilters) {
        logger.info({ message: 'ORDER REPORT: order filter' });
        orderRequestsForReport = await OrderRequestRepository.getOrderRequestsForReport(transformedFilters, userContext);
        const orderRequestIds = orderRequestsForReport.map((orderRequest) => orderRequest._id.toString());
        if (orderRequestIds.length === 0) {
          orderRequestItems = [];
        } else {
          orderRequestItems = (
            await OrderRequestItemServiceV2.getAllOrderRequestItems(
              {
                filters: JSON.parse(JSON.stringify({ ...orderRequestItemDbFilter, orderRequestIds })),
              },
              userContext,
            )
          ).orderRequestItems;
        }
      } else if (hasOrderItemFilters) {
        logger.info({ message: 'ORDER REPORT: order-item filter' });
        orderRequestItems = (
          await OrderRequestItemServiceV2.getAllOrderRequestItems(
            {
              filters: JSON.parse(JSON.stringify(orderRequestItemDbFilter)),
            },
            userContext,
          )
        ).orderRequestItems;

        if (orderRequestItems.length === 0) {
          orderRequestsForReport = [];
        } else {
          const orderRequestIds = orderRequestItems.map((orderRequestItem) => orderRequestItem.orderRequestId.toString());
          orderRequestsForReport = await OrderRequestRepository.getAllOrderRequests(
            { filters: { orderRequestIds } },
            userContext,
          );
        }
      } else {
        logger.info({ message: 'ORDER REPORT: no filter' });
        orderRequestsForReport = await OrderRequestRepository.getOrderRequestsForReport({}, userContext);
        const orderRequestIds = orderRequestsForReport.map((orderRequest) => orderRequest._id.toString());
        if (orderRequestIds.length === 0) {
          orderRequestItems = [];
        } else {
          orderRequestItems = (
            await OrderRequestItemServiceV2.getAllOrderRequestItems({ filters: { orderRequestIds } }, userContext)
          ).orderRequestItems;
        }
      }

      const orderRequestItemsByOrderRequestId = groupBy(orderRequestItems, (element) => element.orderRequestId.toString());
      const expandedOrderEntitiesInput: Array<ExpandOrderEntitiesInput> = orderRequestsForReport.map((orderRequest) => ({
        orderRequest,
        orderRequestItems: orderRequestItemsByOrderRequestId[orderRequest._id.toString()],
      }));
      const expandedOrderRequests = await expandOrderEntities(expandedOrderEntitiesInput, userContext);
      return sortOrderRequestReports(expandedOrderRequests, sortDirection);
    } catch (error: any) {
      logger.error({ error, message: 'Error in getOrderRequestsReport' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to fetch order requests for report.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { sortDirection, ...filters },
        report: true,
        where: 'Order Request Service - getOrderRequestsReport',
      });
    }
  }

  async getReportOrderRequestCodes(
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema['orderRequestCode']>> {
    try {
      return this.getDistinctValuesForAllOrderRequests<'orderRequestCode'>({ filters: {} }, 'orderRequestCode', userContext);
    } catch (error: any) {
      logger.error({ error, message: 'Error in getReportOrderRequestCodes' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to fetch order request codes for report.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        report: true,
        where: 'Order Request Service - getReportOrderRequestCodes',
      });
    }
  }

  /* Mutations */

  async attachAvailableAtSiteIds(
    siteIdsForOrderRequestsInput: Array<OrderRequestEntity.AttachAvailableAtSiteIdsInput>,
  ): Promise<void> {
    await OrderRequestRepository.attachAvailableAtSiteIds(siteIdsForOrderRequestsInput);
  }

  async blockOrderRequest(
    blockOrderRequestInput: OrderRequestEntity.BlockOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    const ORDER_REQUEST_BLOCK_PERIOD = 15; // Minutes
    const { orderRequestId } = blockOrderRequestInput;
    try {
      /** Checks whether the order is accessible to the current user. */
      await PermissionValidator.verifyOrderRequestPickPermissions(userContext);

      const existingOrderRequest = await this.getOrderRequestForEditing(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
      );

      if (!existingOrderRequest) {
        throw new ForbiddenError({
          debugMessage: 'Unavailable/Inaccessible order request tried to access.',
          message: 'This order is not available. Please recheck the order or select a different order.',
          params: { blockOrderRequestInput },
          where: `${__filename} - ${this.blockOrderRequest.name}`,
        });
      }

      validateBlockOrderRequest(existingOrderRequest, userContext);
      /* Creating a new expiry. */
      const newBlockExpireTime = new Date();
      newBlockExpireTime.setMinutes(newBlockExpireTime.getMinutes() + ORDER_REQUEST_BLOCK_PERIOD);
      /* Creating a new blockedStatus object. */
      const blockedStatus = {
        blockExpiresAt: newBlockExpireTime instanceof Date ? newBlockExpireTime.toISOString() : newBlockExpireTime,
        blockedBy: userContext.currentUserInfo._id,
      };
      const isOrderRequestBlocked = await OrderRequestRepository.blockOrderRequest(
        orderRequestId,
        blockedStatus,
        userContext,
        existingOrderRequest.__v,
      );
      if (!isOrderRequestBlocked) {
        throw new InternalServerError({
          error: new Error('Block order call to database did not update the order.'),
          debugMessage: 'Failed to block order requests.',
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          params: { ...blockOrderRequestInput },
          report: true,
          where: 'Order Request Service - blockOrderRequest',
        });
      }
      return { success: true };
    } catch (error: any) {
      logger.error({ error, message: 'Error in blockOrderRequest' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to block order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...blockOrderRequestInput },
        report: true,
        where: 'Order Request Service - blockOrderRequest',
      });
    }
  }

  async cancelOrderRequest(orderRequestId: StringObjectID, userContext: UserContext, session?: ClientSession) {
    return OrderRequestRepository.deleteOrderRequest({ orderRequestId }, userContext, session);
  }

  /**
   * @param {StringObjectID} orderRequestId
   * @param {number} tenantId
   * @param {ClientSession} session
   */
  async closeOrderRequestWithinSessionTransaction(
    { orderRequestId }: OrderRequestEntity.CloseOrderRequestInput,
    userContext: UserContext,
    session: ClientSession,
  ): Promise<Entity.MutationResponse> {
    await OrderRequestItemServiceV2.closeOrderRequestItemsOfOrderRequestWithinSession(
      { orderRequestId },
      userContext,
      session,
    );
    await OrderRequestRepository.closeOrderRequest(orderRequestId, userContext, session);
    return { success: true };
  }

  /**
   * @param {StringObjectID} orderRequestId
   * @param {number} tenantId
   */
  async closeOrderRequest(
    { orderRequestId }: OrderRequestEntity.CloseOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    const session = await mongoose.startSession();
    try {
      let closeOrderRequestPayload: Entity.MutationResponse | undefined;
      await session.withTransaction(async () => {
        closeOrderRequestPayload = await this.closeOrderRequestWithinSessionTransaction(
          { orderRequestId },
          userContext,
          session,
        );
      });
      return closeOrderRequestPayload || { success: true };

      /** Sending order request status updated notification to relevant officials of the tenant. */
      /** SUSPENDED TASK-> OR-531. */
      // if (
      //   updatedOrderDetails &&
      //   updatedOrderDetails.status === OrderRequestEntity.OrderRequestStatusEnum.CLOSED
      // ) {
      //   const { orderRequestItems } =
      //     await OrderRequestItemServiceV2.getAllOrderRequestItemsWithoutUserContext({
      //       filters: { orderRequestIds: [orderId] },
      //     });
      //   const [emailPayload] = await expandOrderEntities(
      //     [
      //       {
      //         order: updatedOrderDetails,
      //         orderItems: orderRequestItems,
      //       },
      //     ],
      //     tenantId,
      //   );
      //   EmailService.sendOrderRequestStatusUpdatedNotification(emailPayload, userContext);
      // }
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({
        error,
        input: { orderRequestId, tenantId: userContext.tenantId },
        message: 'Error in closeOrderRequest',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to close order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequestId },
        report: true,
        where: 'Order Request Service - closeOrderRequest',
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * @param   {OrderRequestEntity.CreateOrderRequestInput} createOrderRequestInput
   * @param   {UserContext} userContext
   * @param   {number} retryCount
   * @returns {void}
   */
  async createExternalOrderRequest(
    createExternalOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<OrderRequestEntity.CreateOrderRequestPayload> {
    const { parentTenantId, childTenantId } = createExternalOrderRequestInput;
    if (!parentTenantId) {
      throw new ValidationError({
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        debugMessage: 'Parent/Child tenant id was not provided for creating external order request.',
        where: `${__filename} - ${this.createExternalOrderRequest.name}`,
        params: { createExternalOrderRequestInput },
      });
    }
    const parentUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, parentTenantId);

    await validateCreateOrderRequestInput(createExternalOrderRequestInput, userContext);

    const { items } = createExternalOrderRequestInput;

    /** Get siteId of current tenant in parent tenant  */
    const siteIdInParentTenant = await getSiteIdOfPartnerTenant(childTenantId || userContext.tenantId, parentUserContext);

    /** Call duplicateAndGetItemsInChildTenant. -> items */
    const duplicatedItems = await duplicateAndGetItemsInChildTenant(items, userContext, parentUserContext);

    /** Create two createOrderRequestInputs and loop through them and use the same logic as createOrderRequest method below.
     * One will have itemIds, siteIds of parent and projectId and departmentId removed & the other will have itemIds of child tenant and
     * all the references remains same.
     *
     * Use parentUserContext for creating order in parent tenant and use the argument userContext for current tenant's order creation.
     */

    const createOrderRequestInParentTenantRepositoryInput = await parseCreateExternalOrderRequestInputForParentTenant(
      createExternalOrderRequestInput,
      siteIdInParentTenant,
      userContext,
      parentUserContext,
    );

    const updatedCreateExternalOrderRequestInputForParentTenant = {
      ...createExternalOrderRequestInput,
      items: items.map((orderRequestItem) => {
        const correspondingItemInChildTenant = duplicatedItems.find(
          (item) => item.entityIdInSourceTenant?.toString() === orderRequestItem.itemId?.toString(),
        );
        return {
          ...omit(orderRequestItem, ['projectId']),
          skuInPartnerTenant: correspondingItemInChildTenant?.sku,
          orderRequestId: createOrderRequestInParentTenantRepositoryInput._id,
        };
      }),
    };

    const session = await mongoose.startSession();

    try {
      /** Persisting the order request and items to the database. */
      let createdOrderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema | undefined = undefined,
        createdOrderRequestInParentTenant: OrderRequestEntity.OrderRequestSchema | undefined = undefined,
        createdOrderRequestItemsInChildTenant: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [],
        createdOrderRequestItemsInParentTenant: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [];
      await session.withTransaction(
        async () => {
          /** Creating order request entities in parent tenant */
          [createdOrderRequestInParentTenant, createdOrderRequestItemsInParentTenant] = await Promise.all([
            OrderRequestRepository.createOrderRequest(
              createOrderRequestInParentTenantRepositoryInput,
              parentUserContext,
              session,
            ),
            OrderRequestItemServiceV2.createOrderRequestItems(
              updatedCreateExternalOrderRequestInputForParentTenant.items,
              parentUserContext,
              session,
            ),
          ]);
          const { createOrderRequestInChildTenantRepositoryInput, createOrderRequestItemsInChildTenantInput } =
            await parseCreateExternalOrderRequestInputForChildTenant(
              {
                createExternalOrderRequestInput,
                duplicatedItems,
                orderRequestItemsOfParentTenant: createdOrderRequestItemsInParentTenant,
                parentUserContext,
              },
              userContext,
            );
          /** Creating order request entities in child tenant */
          [createdOrderRequestInChildTenant, createdOrderRequestItemsInChildTenant] = await Promise.all([
            OrderRequestRepository.createOrderRequest(createOrderRequestInChildTenantRepositoryInput, userContext, session),
            OrderRequestItemServiceV2.createOrderRequestItems(
              createOrderRequestItemsInChildTenantInput.map((item) => ({
                ...item,
                orderRequestId: createOrderRequestInChildTenantRepositoryInput._id,
              })),
              userContext,
              session,
            ),
          ]);
        },
        { writeConcern: { w: 'majority' } },
      );

      if (createdOrderRequestInParentTenant && createdOrderRequestItemsInParentTenant) {
        try {
          /** Sending email notification for the order request created. */
          const [orderRequestEmailPayload] = await expandOrderEntities(
            [
              {
                orderRequest: createdOrderRequestInParentTenant,
                orderRequestItems: createdOrderRequestItemsInParentTenant,
              },
            ],
            parentUserContext,
          );

          /** Sending order received email to the requestor for confirmation. */
          EmailService.sendOrderRequestReceivedNotification(orderRequestEmailPayload, parentUserContext);
        } catch (error: any) {
          logger.error({ error, message: 'Error in sending notification.' });
        }
      }

      if (createdOrderRequestInChildTenant && createdOrderRequestItemsInChildTenant) {
        try {
          /** Sending email notification for the order request created. */
          const [orderRequestEmailPayload] = await expandOrderEntities(
            [
              {
                orderRequest: createdOrderRequestInChildTenant,
                orderRequestItems: createdOrderRequestItemsInChildTenant,
              },
            ],
            userContext,
          );

          /** Sending order received email to the requestor for confirmation. */
          EmailService.sendOrderRequestReceivedNotification(orderRequestEmailPayload, userContext);
        } catch (error: any) {
          logger.error({ error, message: 'Error in sending notification.' });
        }
      }
      return { success: true, orderRequest: createdOrderRequestInChildTenant };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in createExternalOrderRequest' });
      if (error.errorLabels && error.errorLabels.indexOf('TransientTransactionError') >= 0 && retryCount < 2) {
        logger.warn({ createExternalOrderRequestInput, message: `Retrying create order request` });
        return this.createOrderRequest(createExternalOrderRequestInput, userContext, retryCount + 1);
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to create order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...createExternalOrderRequestInput },
        report: true,
        where: `${__filename} - ${this.createExternalOrderRequest.name}`,
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * @param   {OrderRequestEntity.CreateOrderRequestInput} createOrderRequestInput
   * @param   {UserContext} userContext
   * @param   {number} retryCount
   * @returns {void}
   */
  async createOrderRequest(
    createOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
    userContext: UserContext,
    retryCount = 0,
    session: ClientSession | undefined = undefined,
  ): Promise<OrderRequestEntity.CreateOrderRequestPayload> {
    if (session === undefined) {
      const newSession = await mongoose.startSession();
      return this.createOrderRequest(createOrderRequestInput, userContext, retryCount, newSession);
    }
    await validateCreateOrderRequestInput(createOrderRequestInput, userContext);
    const parsedOrderRequest = await parseCreateOrderRequestInput(createOrderRequestInput, userContext);

    try {
      let createdOrderRequest: OrderRequestEntity.OrderRequestSchema | undefined;
      let createdOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [];
      /** Persisting the order request and items to the database. */
      await session.withTransaction(
        async () => {
          [createdOrderRequest, createdOrderRequestItems] = await Promise.all([
            OrderRequestRepository.createOrderRequest(parsedOrderRequest, userContext, session),
            OrderRequestItemServiceV2.createOrderRequestItems(
              createOrderRequestInput.items.map((item) => ({
                ...item,
                orderRequestId: parsedOrderRequest._id,
              })),
              userContext,
              session,
            ),
          ]);
        },
        { writeConcern: { w: 'majority' } },
      );

      if (createdOrderRequest) {
        try {
          /** Sending email notification for the order request created. */
          const [orderRequestEmailPayload] = await expandOrderEntities(
            [{ orderRequest: createdOrderRequest, orderRequestItems: createdOrderRequestItems }],
            userContext,
          );

          /** Sending order created email to the relevant officials of the tenant. */
          /** SUSPENDED TASK-> OR-531. */
          // EmailService.sendOrderCreatedNotification(emailPayload, userContext);

          /** Sending order received email to the requestor for confirmation. */
          EmailService.sendOrderRequestReceivedNotification(orderRequestEmailPayload, userContext);
        } catch (error: any) {
          logger.error({ error, message: 'Error in sending notification.' });
        }
      }
      return { success: true, orderRequest: createdOrderRequest };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in createOrderRequest' });
      if (error.errorLabels && error.errorLabels.indexOf('TransientTransactionError') >= 0 && retryCount < 2) {
        logger.warn({ createOrderRequestInput, message: `Retrying create order request` });
        return this.createOrderRequest(createOrderRequestInput, userContext, retryCount + 1);
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to create order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...createOrderRequestInput },
        report: true,
        where: 'Order Request Service - createOrderRequest',
      });
    } finally {
      await session.endSession();
    }
  }

  async deleteOrderRequest(
    deleteOrderRequestInput: OrderRequestEntity.DeleteOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    validateDeleteOrderRequestInput(deleteOrderRequestInput);

    /** Checks whether the order is accessible to the current user. */
    const existingOrderRequest = await this.getOrderRequestForDelete(
      { filters: { orderRequestIds: [deleteOrderRequestInput.orderRequestId] } },
      userContext,
    );

    if (!existingOrderRequest) {
      throw new ForbiddenError({
        debugMessage: 'Unavailable/Inaccessible order request tried to delete.',
        message: 'This order is not available. Please recheck the order or select a different order.',
        params: { deleteOrderRequestInput },
        where: `${__filename} - ${this.deleteOrderRequest.name}`,
      });
    }

    let existingOrderRequestInPartnerTenant: OrderRequestEntity.OrderRequestSchema | undefined;
    if (existingOrderRequest.entityIdInSourceTenant && existingOrderRequest.parentTenantId) {
      const parentUserContext = contextUserUtil.switchTenantForInternalUsage(
        userContext,
        existingOrderRequest.parentTenantId,
      );
      const { orderRequests } = await this.getAllOrderRequests(
        { filters: { orderRequestIds: [existingOrderRequest.entityIdInSourceTenant] } },
        parentUserContext,
      );
      [existingOrderRequestInPartnerTenant] = orderRequests;
    } else if (existingOrderRequest.childTenantId) {
      const childUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, existingOrderRequest.childTenantId);
      const { orderRequests } = await this.getAllOrderRequests(
        { filters: { entityIdsInSourceTenant: [existingOrderRequest._id] } },
        childUserContext,
      );
      [existingOrderRequestInPartnerTenant] = orderRequests;
    }

    const session = await mongoose.startSession();

    try {
      let deletedOrderRequest: OrderRequestEntity.OrderRequestSchema | null | undefined;
      /** Persisting the order request and items to the database. */
      await session.withTransaction(
        async () => {
          await OrderRequestItemServiceV2.deleteOrderRequestItemsByOrderRequestId(
            deleteOrderRequestInput.orderRequestId,
            userContext,
            session,
          );

          deletedOrderRequest = await OrderRequestRepository.deleteOrderRequest(
            deleteOrderRequestInput,
            userContext,
            session,
          );
          if (existingOrderRequestInPartnerTenant) {
            await Promise.all([
              OrderRequestItemServiceV2.deleteOrderRequestItemsByOrderRequestId(
                existingOrderRequestInPartnerTenant._id,
                userContext,
                session,
              ),
              OrderRequestRepository.deleteOrderRequest(
                { orderRequestId: existingOrderRequestInPartnerTenant._id },
                userContext,
                session,
              ),
            ]);
          }
        },
        { writeConcern: { w: 'majority' } },
      );

      if (deletedOrderRequest) {
        try {
          /* Fetching updating orderRequestItems. */
          const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
            { filters: { orderRequestIds: [deleteOrderRequestInput.orderRequestId] } },
            userContext,
          );
          /* Sending email notification for the order request created. */
          const [orderRequestEmailPayload] = await expandOrderEntities(
            [
              {
                orderRequest: deletedOrderRequest,
                orderRequestItems,
              },
            ],
            userContext,
          );

          EmailService.sendOrderRequestCancelledNotification(orderRequestEmailPayload, userContext);
          if (existingOrderRequestInPartnerTenant) {
            const partnerUserContext = contextUserUtil.switchTenantForInternalUsage(
              userContext,
              existingOrderRequestInPartnerTenant.tenantId,
            );
            /* Fetching updating orderRequestItems. */
            const { orderRequestItems: orderRequestItemsInParentTenant } =
              await OrderRequestItemServiceV2.getAllOrderRequestItems(
                { filters: { orderRequestIds: [existingOrderRequestInPartnerTenant._id] } },
                partnerUserContext,
              );
            /* Sending email notification for the order request created. */
            const [orderRequestEmailPayloadForParentTenant] = await expandOrderEntities(
              [
                {
                  orderRequest: existingOrderRequestInPartnerTenant,
                  orderRequestItems: orderRequestItemsInParentTenant,
                },
              ],
              partnerUserContext,
            );

            EmailService.sendOrderRequestCancelledNotification(orderRequestEmailPayloadForParentTenant, partnerUserContext);
          }
        } catch (error) {
          logger.error({ error, message: 'Error in sending notification.' });
        }
      }
      return { success: true };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in deleteOrderRequest' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to delete order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...deleteOrderRequestInput },
        report: true,
        where: 'Order Request Service - deleteOrderRequest',
      });
    } finally {
      await session.endSession();
    }
  }

  async unblockOrderRequest(
    unblockOrderRequestInput: OrderRequestEntity.UnblockOrderRequestInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    const { orderRequestId } = unblockOrderRequestInput;
    try {
      /** Checks whether the order is accessible to the current user. */
      const existingOrderRequest = await this.getOrderRequestForEditing(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
      );

      if (!existingOrderRequest) {
        throw new ForbiddenError({
          debugMessage: 'Unavailable/Inaccessible order request tried to unblock.',
          message: 'This order is not available. Please recheck the order or select a different order.',
          params: { ...unblockOrderRequestInput },
          where: `${__filename} - ${this.unblockOrderRequest.name}`,
        });
      }
      validateUnblockOrderRequest(existingOrderRequest, userContext);
      await OrderRequestRepository.unblockOrderRequest(orderRequestId, userContext);
      return { success: true };
    } catch (error: any) {
      logger.error({ error, message: 'Error in unblockOrderRequest' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to unblock order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...unblockOrderRequestInput },
        report: true,
        where: 'Order Request Service - unblockOrderRequest',
      });
    }
  }

  async updateFulfillingSites(
    orderRequestId: StringObjectID,
    fulfillingSiteId: StringObjectID,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<Entity.MutationResponse> {
    await OrderRequestRepository.updateFulfillingSites(orderRequestId, fulfillingSiteId, userContext, session);
    return { success: true };
  }

  async updateExternalOrderRequest(
    updateExternalOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<Entity.MutationResponse> {
    const { orderRequestId } = updateExternalOrderRequestInput;
    /** Checks whether the order is accessible to the current user. */
    const existingOrderRequestInCurrentTenant = await this.getOrderRequestForEditing(
      { filters: { orderRequestIds: [orderRequestId] } },
      userContext,
    );

    if (!existingOrderRequestInCurrentTenant) {
      throw new ForbiddenError({
        debugMessage: `Order request with id: ${orderRequestId} is not accessible to the user.`,
        message: `The order request you are trying to edit is not accessible to you. Please refresh and try again`,
        params: { updateExternalOrderRequestInput },
        where: `${__filename} - ${this.updateExternalOrderRequest.name}`,
      });
    }

    let existingOrderRequestInPartnerTenant: OrderRequestEntity.OrderRequestSchema;
    if (existingOrderRequestInCurrentTenant.entityIdInSourceTenant && existingOrderRequestInCurrentTenant.parentTenantId) {
      const parentUserContext = contextUserUtil.switchTenantForInternalUsage(
        userContext,
        existingOrderRequestInCurrentTenant.parentTenantId,
      );
      const { orderRequests } = await this.getAllOrderRequests(
        {
          filters: {
            orderRequestIds: [existingOrderRequestInCurrentTenant.entityIdInSourceTenant],
          },
        },
        parentUserContext,
      );
      [existingOrderRequestInPartnerTenant] = orderRequests;
    } else {
      const childUserContext = contextUserUtil.switchTenantForInternalUsage(
        userContext,
        existingOrderRequestInCurrentTenant.childTenantId as StringObjectID,
      );
      const { orderRequests } = await this.getAllOrderRequests(
        {
          filters: { entityIdsInSourceTenant: [existingOrderRequestInCurrentTenant._id] },
        },
        childUserContext,
      );
      [existingOrderRequestInPartnerTenant] = orderRequests;
    }

    if (!existingOrderRequestInPartnerTenant) {
      throw new ResourceNotFoundError({
        debugMessage: `Order request corresponding to the ${orderRequestId} was not found in partner tenant. Possibility of data corruption.`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        where: `${__filename} - ${this.updateExternalOrderRequest.name}`,
        params: {
          updateExternalOrderRequestInput,
          existingOrderRequestInCurrentTenant,
        },
      });
    }

    await validateUpdateOrderRequestInput(updateExternalOrderRequestInput, userContext, existingOrderRequestInCurrentTenant);

    const { updates } = updateExternalOrderRequestInput;
    const partnerUserContext = contextUserUtil.switchTenantForInternalUsage(
      userContext,
      (existingOrderRequestInCurrentTenant.parentTenantId ||
        existingOrderRequestInCurrentTenant.childTenantId) as StringObjectID,
    );

    const { items: updatedOrderRequestItems } = updates;

    let billToSiteIdInParentTenant: StringObjectID, destinationSiteIdInParentTenant: StringObjectID;

    if (existingOrderRequestInCurrentTenant.parentTenantId) {
      billToSiteIdInParentTenant = existingOrderRequestInPartnerTenant.billToSiteId;
      destinationSiteIdInParentTenant = existingOrderRequestInPartnerTenant.destinationSiteId;
    } else {
      billToSiteIdInParentTenant = existingOrderRequestInCurrentTenant.billToSiteId;
      destinationSiteIdInParentTenant = existingOrderRequestInCurrentTenant.destinationSiteId;
    }

    const duplicatedParentItemsInChildTenant = await duplicateAndGetItemsInChildTenant(
      updatedOrderRequestItems,
      existingOrderRequestInCurrentTenant.parentTenantId ? userContext : partnerUserContext,
      existingOrderRequestInCurrentTenant.parentTenantId ? partnerUserContext : userContext,
    );

    let existingOrderRequestItemsOfChildTenant = updatedOrderRequestItems;
    if (existingOrderRequestInCurrentTenant.childTenantId) {
      const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
        { filters: { orderRequestIds: [existingOrderRequestInPartnerTenant._id] } },
        partnerUserContext,
      );
      existingOrderRequestItemsOfChildTenant = orderRequestItems;
    }

    let existingOrderRequestItemsOfParentTenant = updatedOrderRequestItems;
    if (existingOrderRequestInCurrentTenant.parentTenantId) {
      const { orderRequestItems } = await OrderRequestItemServiceV2.getAllOrderRequestItems(
        { filters: { orderRequestIds: [existingOrderRequestInPartnerTenant._id] } },
        partnerUserContext,
      );
      existingOrderRequestItemsOfParentTenant = orderRequestItems;
    }

    const updatedOrderRequestItemsOfChildTenant: OrderRequestEntity.UpdateOrderRequestItemInput[] = [];
    const updatedOrderRequestItemsOfParentTenant: OrderRequestEntity.UpdateOrderRequestItemInput[] = [];
    updatedOrderRequestItems.forEach((updatedOrderRequestItem) => {
      const correspondingItemInChildTenant = duplicatedParentItemsInChildTenant.find(
        ({ _id, entityIdInSourceTenant }) =>
          entityIdInSourceTenant?.toString() === updatedOrderRequestItem.itemId?.toString() ||
          _id.toString() === updatedOrderRequestItem.itemId?.toString(),
      );
      let correspondingOrderRequestItemInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema | undefined =
        updatedOrderRequestItem;
      if (existingOrderRequestInCurrentTenant.childTenantId) {
        correspondingOrderRequestItemInChildTenant = existingOrderRequestItemsOfChildTenant.find(
          ({ entityIdInSourceTenant }) => entityIdInSourceTenant?.toString() === updatedOrderRequestItem._id?.toString(),
        );
      }
      let correspondingOrderRequestItemInParentTenant: OrderRequestItemEntity.OrderRequestItemSchema | undefined =
        updatedOrderRequestItem;
      if (existingOrderRequestInCurrentTenant.parentTenantId) {
        correspondingOrderRequestItemInParentTenant = existingOrderRequestItemsOfParentTenant.find(
          ({ _id }) => _id?.toString() === updatedOrderRequestItem.entityIdInSourceTenant?.toString(),
        );
      }

      if (!correspondingOrderRequestItemInChildTenant || !correspondingOrderRequestItemInParentTenant) {
        throw new ResourceNotFoundError({
          debugMessage: `Item corresponding to one of the tenant was not found in child/parent tenant. Possibility of data corruption.`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${this.updateExternalOrderRequest.name}`,
          params: { updatedOrderRequestItem, existingOrderRequestInCurrentTenant },
        });
      }

      updatedOrderRequestItemsOfChildTenant.push({
        ...correspondingOrderRequestItemInChildTenant,
        ...(existingOrderRequestInCurrentTenant.parentTenantId ? updatedOrderRequestItem : {}),
        categoryId: correspondingItemInChildTenant?.categoryId,
        itemId: correspondingItemInChildTenant?._id,
        skuInPartnerTenant:
          correspondingOrderRequestItemInChildTenant.itemId?.toString() === updatedOrderRequestItem.itemId?.toString()
            ? correspondingOrderRequestItemInChildTenant.skuInPartnerTenant
            : updatedOrderRequestItem.sku,
        cost:
          Math.round(
            ((!!correspondingItemInChildTenant?.costOverride
              ? (correspondingItemInChildTenant?.unitCost || 0) *
                (1 + (correspondingItemInChildTenant?.costOverride as number) / 100)
              : correspondingItemInChildTenant?.unitCost || 0) +
              Number.EPSILON) *
              100,
          ) / 100,
        sku: correspondingItemInChildTenant?.sku,
        description: correspondingItemInChildTenant?.description,
        imageUrl: correspondingItemInChildTenant?.attachments && correspondingItemInChildTenant?.attachments[0]?.url,
        title: correspondingItemInChildTenant?.title,
        quantity: updatedOrderRequestItem.quantity,
        isEdited: updatedOrderRequestItem.isEdited,
      });
      updatedOrderRequestItemsOfParentTenant.push({
        ...correspondingOrderRequestItemInParentTenant,
        ...(existingOrderRequestInCurrentTenant.childTenantId ? updatedOrderRequestItem : {}),
        itemId:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.itemId
            : correspondingOrderRequestItemInParentTenant.itemId,
        categoryId:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.categoryId
            : correspondingOrderRequestItemInParentTenant.categoryId,
        cost:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.cost
            : correspondingOrderRequestItemInParentTenant.cost,
        sku:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.sku
            : correspondingOrderRequestItemInParentTenant.sku,
        description:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.description
            : correspondingOrderRequestItemInParentTenant.description,
        imageUrl:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.imageUrl
            : correspondingOrderRequestItemInParentTenant.imageUrl,
        title:
          correspondingItemInChildTenant?.sku !== correspondingOrderRequestItemInParentTenant.skuInPartnerTenant
            ? updatedOrderRequestItem.title
            : correspondingOrderRequestItemInParentTenant.title,
        projectId: existingOrderRequestInCurrentTenant.childTenantId
          ? updatedOrderRequestItem.projectId
          : correspondingOrderRequestItemInParentTenant.projectId,
        skuInPartnerTenant: correspondingItemInChildTenant?.sku,
        quantity: updatedOrderRequestItem.quantity,
        isEdited: updatedOrderRequestItem.isEdited,
      });
    });

    const existingOrderRequestInChildTenant = existingOrderRequestInCurrentTenant.parentTenantId
      ? existingOrderRequestInCurrentTenant
      : existingOrderRequestInPartnerTenant;
    const existingOrderRequestInParentTenant = existingOrderRequestInCurrentTenant.childTenantId
      ? existingOrderRequestInCurrentTenant
      : existingOrderRequestInPartnerTenant;

    const updateOrderRequstOfChildTenantInput: OrderRequestEntity.UpdateOrderRequestInput = {
      orderRequestId: existingOrderRequestInChildTenant._id,
      updates: {
        ...existingOrderRequestInChildTenant,
        ...(existingOrderRequestInCurrentTenant.parentTenantId ? updateExternalOrderRequestInput.updates : {}),
        items: updatedOrderRequestItemsOfChildTenant,
      },
    };

    const updateOrderRequstOfParentTenantInput: OrderRequestEntity.UpdateOrderRequestInput = {
      orderRequestId: existingOrderRequestInParentTenant._id,
      updates: {
        ...existingOrderRequestInParentTenant,
        ...(existingOrderRequestInCurrentTenant.childTenantId ? updateExternalOrderRequestInput.updates : {}),
        deliverToId:
          updateExternalOrderRequestInput.updates.deliverToId || updateExternalOrderRequestInput.updates.createdById,
        billToSiteId: billToSiteIdInParentTenant,
        destinationSiteId: destinationSiteIdInParentTenant,
        items: updatedOrderRequestItemsOfParentTenant,
      },
    };

    const session = await mongoose.startSession();
    try {
      let finalOrderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema | undefined;
      let finalOrderRequestInParentTenant: OrderRequestEntity.OrderRequestSchema | undefined;
      /** Persisting the order request and items to the database. */
      await session.withTransaction(
        async () => {
          const { updates: updatesInChildTenant } = updateOrderRequstOfChildTenantInput;
          const { updates: updatesInParentTenant } = updateOrderRequstOfParentTenantInput;
          if (
            existingOrderRequestInChildTenant &&
            (existingOrderRequestInChildTenant.billToSiteId.toString() !== updatesInChildTenant.billToSiteId.toString() ||
              existingOrderRequestInChildTenant.deliverToId?.toString() !== updatesInChildTenant.deliverToId?.toString() ||
              existingOrderRequestInChildTenant.departmentId?.toString() !== updatesInChildTenant.departmentId?.toString() ||
              existingOrderRequestInChildTenant.destinationSiteId.toString() !==
                updatesInChildTenant.destinationSiteId.toString())
          ) {
            const orderRequestUpdatesInChildTenant = await parseUpdateOrderRequestInput(
              updateOrderRequstOfChildTenantInput,
              existingOrderRequestInChildTenant,
              userContext,
            );
            finalOrderRequestInChildTenant = await OrderRequestRepository.updateOrderRequest(
              updateOrderRequstOfChildTenantInput.orderRequestId,
              orderRequestUpdatesInChildTenant,
              userContext,
              session,
            );
          }
          if (
            existingOrderRequestInParentTenant.childTenantId &&
            existingOrderRequestInParentTenant.deliverToId?.toString() !== updatesInParentTenant.deliverToId?.toString()
          ) {
            const orderRequestUpdatesInParentTenant = await parseUpdateOrderRequestInput(
              updateOrderRequstOfParentTenantInput,
              existingOrderRequestInParentTenant,
              userContext,
            );

            await OrderRequestRepository.updateOrderRequest(
              updateOrderRequstOfParentTenantInput.orderRequestId,
              orderRequestUpdatesInParentTenant,
              userContext,
              session,
            );
          }
          await Promise.all([
            OrderRequestItemServiceV2.updateOrderRequestItems(
              updateOrderRequstOfChildTenantInput,
              finalOrderRequestInChildTenant as OrderRequestEntity.OrderRequestSchema,
              userContext,
              session,
            ),

            OrderRequestItemServiceV2.updateOrderRequestItems(
              updateOrderRequstOfParentTenantInput,
              finalOrderRequestInParentTenant as OrderRequestEntity.OrderRequestSchema,
              userContext,
              session,
            ),
          ]);
        },
        { writeConcern: { w: 'majority' } },
      );
      await Promise.all([
        this.updateLeastItemStatus(
          {
            orderRequestId: existingOrderRequestInChildTenant._id,
          },
          userContext,
        ),
        this.updateLeastItemStatus(
          {
            orderRequestId: existingOrderRequestInParentTenant._id,
          },
          userContext,
        ),
      ]);
      return { success: true };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in updateExternalOrderRequest' });
      if (error.errmsg && error.errmsg === 'WriteConflict' && retryCount < 2) {
        return this.updateExternalOrderRequest(updateExternalOrderRequestInput, userContext, retryCount + 1);
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to update external order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...updateExternalOrderRequestInput },
        report: true,
        where: `${__filename} - ${this.updateExternalOrderRequest.name}`,
      });
    } finally {
      await session.endSession();
    }
  }

  async updateOrderRequest(
    updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<Entity.MutationResponse> {
    const { orderRequestId } = updateOrderRequestInput;
    /** Checks whether the order is accessible to the current user. */
    const existingOrderRequest = await this.getOrderRequestForEditing(
      { filters: { orderRequestIds: [orderRequestId] } },
      userContext,
    );

    await validateUpdateOrderRequestInput(updateOrderRequestInput, userContext, existingOrderRequest);
    const session = await mongoose.startSession();

    try {
      let finalOrderRequest: OrderRequestEntity.OrderRequestSchema | undefined;
      /** Persisting the order request and items to the database. */
      await session.withTransaction(
        async () => {
          const { updates } = updateOrderRequestInput;
          if (
            existingOrderRequest &&
            (existingOrderRequest.billToSiteId.toString() !== updates.billToSiteId.toString() ||
              existingOrderRequest.deliverToId?.toString() !== updates.deliverToId?.toString() ||
              existingOrderRequest.departmentId?.toString() !== updates.departmentId?.toString() ||
              existingOrderRequest.destinationSiteId.toString() !== updates.destinationSiteId.toString())
          ) {
            const orderRequestUpdates = await parseUpdateOrderRequestInput(
              updateOrderRequestInput,
              existingOrderRequest,
              userContext,
            );
            finalOrderRequest = await OrderRequestRepository.updateOrderRequest(
              updateOrderRequestInput.orderRequestId,
              orderRequestUpdates,
              userContext,
              session,
            );
          }
          await OrderRequestItemServiceV2.updateOrderRequestItems(
            updateOrderRequestInput,
            finalOrderRequest as OrderRequestEntity.OrderRequestSchema,
            userContext,
            session,
          );
        },
        { writeConcern: { w: 'majority' } },
      );
      await this.updateLeastItemStatus(
        {
          orderRequestId: updateOrderRequestInput.orderRequestId,
        },
        userContext,
      );
      return { success: true };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in updateOrderRequest' });
      if (error.errmsg && error.errmsg === 'WriteConflict' && retryCount < 2) {
        return this.updateOrderRequest(updateOrderRequestInput, userContext, retryCount + 1);
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to update order requests.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { ...updateOrderRequestInput },
        report: true,
        where: 'Order Request Service - updateOrderRequest',
      });
    } finally {
      await session.endSession();
    }
  }

  async updateLeastItemStatus(
    updateLeastItemStatusInput: OrderRequestEntity.UpdateLeastItemStatusInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<Entity.MutationResponse> {
    let { orderRequestItems = [], leastItemStatus } = updateLeastItemStatusInput;
    const { orderRequestId } = updateLeastItemStatusInput;
    if (!leastItemStatus) {
      if (orderRequestItems.length === 0) {
        const { orderRequestItems: existingOrderRequestItems } =
          await OrderRequestItemServiceV2.getAllOrderRequestItemsWithoutUserContext(
            {
              filters: { orderRequestIds: [orderRequestId] },
              projection: { status: 1, statusHistory: 1, type: 1 },
            },
            session,
          );
        orderRequestItems = existingOrderRequestItems;
      }
      leastItemStatus = parseLeastOrderRequestItemStatus(orderRequestItems);
    }
    if (leastItemStatus) {
      logger.debug({
        message: `Setting leastItemStatus to ${leastItemStatus} in orderRequestId ${orderRequestId}`,
      });
      await OrderRequestRepository.updateLeastItemStatus(orderRequestId, leastItemStatus, userContext, session);
    } else {
      logger.debug({ message: `No leastItemStatus found for orderRequestId ${orderRequestId}` });
    }
    return { success: true };
  }

  async updateScheduleId(
    orderRequestId: StringObjectID,
    scheduleId: StringObjectID,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<Entity.MutationResponse> {
    await OrderRequestRepository.updateScheduleId(orderRequestId, scheduleId, userContext, session);
    return { success: true };
  }
}

export const OrderRequestServiceV2 = new OrderRequestServiceClass();
