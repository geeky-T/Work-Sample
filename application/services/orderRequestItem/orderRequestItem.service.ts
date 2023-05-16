import {
  OrderRequestItemStatusWithDependentActionRequired,
  OrderRequestItemStatusWithNoDependentActionRequired,
} from '@const/orderRequestItem';
import { DeliverNotificationPayloadInput } from '@custom-types/NotificationTypes/payloads';
import { OrderRequestItemRepository } from '@models/orderRequestItem/orderRequestItem.repository';
import {
  ForbiddenError,
  InternalRetriableError,
  InternalServerError,
  ProcureError,
  ResourceNotFoundError,
  ValidationError,
  logger,
} from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  ShippingTransactionEntity,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { OrderRequestServiceV2 } from '@services/orderRequest/orderRequest.service';
import { RetriableMondoDBErrorMessageRegex } from '@utils/RetriableMongoDBException';
import { expandOrderEntities } from '@utils/expandOrderEntities';
import { PermissionValidator } from '@utils/validators/orderRequestPermission.validator';
import { groupBy, uniq } from 'lodash';
import mongoose, { ClientSession } from 'mongoose';
import { ShippingTransactionService, TransactionService } from '../../transport/__grpc/client/services';
import { CreateOrderRequestItemRepositoryInput, UpdateOrderRequestItemRepositoryInput } from '../../types/OrderRequestItem';
import { contextUserUtil } from '../../utils/userAuthentication/contextUser.util';
import { EmailService } from '../externals/EmailServiceV3';
import InventoryService from '../externals/InventoryService';
import {
  scheduleCloseOrderRequests,
  scheduleOrderRequestForClosing,
  shouldCancelOrderRequest,
  shouldCloseOrderRequest,
} from '../orderRequest/helpers/orderRequestUtils.helper';
import { parseCreateOrderRequestItemsInput } from './helpers/createOrderRequestItems.helper';
import {
  validateCloseOrderRequestItemsInput,
  validateCreateOrderRequestItemsInput,
  validateDeleteOrderRequestItems,
  validateResendReturnedOrderRequestItemEmail,
  validateReturnOrderRequestItemsInput,
  validateUnpackOrderRequestItemsOfTrackingIds,
  validateUpdateOrderRequestItemStatusByOrderRequestId,
  validateUpdateOrderRequestItemsInput,
} from './helpers/orderRequestItem.validators';
import {
  createExternalOrderMoveTransactionForReturn,
  packReturnedOrderRequestItemsIntoAContainer,
  parseReturnedOrderRequestItems,
  parseReturnedOrderRequestItemsForParentTenant,
} from './helpers/returnOrderRequestItems.helper';
import { sendOrderRequestUpdatedEmailForStatusUpdates } from './helpers/sendOrderRequestUpdatedEmail.helper';
import { sendReturnOrderRequestItemEmailBasedOnTrackingId } from './helpers/sendReturnOrderRequestItemEmail.helper';
import {
  parseUnpackOrderRequestItemsOfParentTrackingIds,
  parseUnpackOrderRequestItemsOfTrackingIds,
} from './helpers/unpackOrderRequestItemsOfTrackingIds.helper';
import { parseUpdateOrderRequestItemsInput } from './helpers/updateOrderRequestItems.helper';
import {
  parseUpdateOrderRequestItemsStatusByTrackingUpdates,
  parseUpdateOrderRequestItemsStatusByTrackingUpdatesInPartnerTenant,
} from './helpers/updateOrderRequestItemsStatusByTrackingUpdates.helper';

class OrderRequestItemServiceClass {
  /* Queries */
  async getAllOrderRequestItems(
    getAllOrderRequestItemsInput: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    const orderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItems(
      getAllOrderRequestItemsInput,
      userContext,
      session,
    );
    return { orderRequestItems };
  }

  async getOrderRequestItemsByOrderRequestIdsAcrossTenants(
    input: OrderRequestItemEntity.GetOrderRequestItemsByOrderRequestIdsAcrossTenantsInput,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    if (input.filters.orderRequestIds.length === 0) {
      return { orderRequestItems: [] };
    }
    const orderRequestItems = await OrderRequestItemRepository.getOrderRequestItemsAcrossTenants(input);
    return { orderRequestItems };
  }

  async getOrderRequestItemsByIdsAcrossTenants(
    input: OrderRequestItemEntity.GetOrderRequestItemsByIdsAcrossTenantsInput,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    if (input.filters.orderRequestItemIds.length === 0) {
      return { orderRequestItems: [] };
    }
    const orderRequestItems = await OrderRequestItemRepository.getOrderRequestItemsAcrossTenants(input);
    return { orderRequestItems };
  }

  async getDistinctValuesForAllOrderRequestItems<T extends keyof OrderRequestItemEntity.OrderRequestItemSchema>(
    getAllOrderRequestItemsInput: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    field: T,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.OrderRequestItemSchema[T][]> {
    return OrderRequestItemRepository.getDistinctValuesForAllOrderRequestItems<typeof field>(
      getAllOrderRequestItemsInput,
      field,
      userContext,
    );
  }

  /** Should be called from asynchronous internal jobs/calls. */
  async getAllOrderRequestItemsWithoutUserContext(
    getAllOrderRequestItemsInput: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    session?: ClientSession,
  ): Promise<OrderRequestItemEntity.GetAllOrderRequestItemsPayload> {
    const orderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItems(
      getAllOrderRequestItemsInput,
      undefined,
      session,
    );
    return { orderRequestItems };
  }

  async getPickableOrderRequestItemsOfOrderRequest(
    orderRequestId: StringObjectID,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.OrderRequestItemSchema[]> {
    /** Find which among create/inventoryShipment, create/assetShipment the current user has. */
    const pickListAccessType = await PermissionValidator.getPickItemsAccessTypes(userContext);

    const { OrderRequestItemTypeEnum } = OrderRequestItemEntity;
    const { orderRequestItems: openOrderRequestItems } = await this.getAllOrderRequestItems(
      {
        filters: {
          orderRequestIds: [orderRequestId],
          statuses: [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          ],
          types: ([] as OrderRequestItemEntity.OrderRequestItemTypeEnum[]).concat(
            pickListAccessType[OrderRequestItemTypeEnum.ASSET] ? [OrderRequestItemTypeEnum.ASSET] : [],
            pickListAccessType[OrderRequestItemTypeEnum.INVENTORY] ? [OrderRequestItemTypeEnum.INVENTORY] : [],
          ),
        },
      },
      userContext,
    );
    return openOrderRequestItems;
  }

  async getSitesForOpenOrderRequestItemsOfAnOrderRequest(
    { orderRequestId }: OrderRequestEntity.BlockOrderRequestInput,
    userContext: UserContext,
  ) {
    try {
      const openOrderRequestItems = await this.getPickableOrderRequestItemsOfOrderRequest(orderRequestId, userContext);
      if (openOrderRequestItems.length === 0) {
        throw new ValidationError({
          report: false,
          debugMessage: `No items left to pick.`,
          message: `Nice work! No items are left to pick for this order. Please select another order request to pick.`,
          params: { orderRequestId },
          where: `${__filename} - ${this.getSitesForOpenOrderRequestItemsOfAnOrderRequest.name}`,
        });
      }
      const openOrderRequestItemSKUs = openOrderRequestItems
        .map((item) => item.itemId)
        .filter((itemId) => {
          if (!itemId) {
            return false;
          }
          return true;
        }) as string[];
      const sites = await InventoryService.getStockedSitesOfItem(openOrderRequestItemSKUs, userContext);
      if (sites.length === 0) {
        await OrderRequestServiceV2.unblockOrderRequest({ orderRequestId }, userContext);
        logger.debug(
          'One or more item(s) remaining to be picked is not available at any sites. Please restock the item(s).',
        );
        throw new ResourceNotFoundError({
          debugMessage: `One or more item(s) remaining to be picked is not available at any sites. Please restock the item(s).`,
          message: `At least one item on this pick list is not in stock at any site. Please restock the item to continue.`,
          params: { orderRequestId },
          where: `${__filename} - ${this.getSitesForOpenOrderRequestItemsOfAnOrderRequest.name}`,
        });
      }
      return sites;
    } catch (error) {
      logger.error({ error, message: 'Error in fetching open items and their sites' });
      await OrderRequestServiceV2.unblockOrderRequest({ orderRequestId }, userContext);
      throw error;
    }
  }

  /* Mutations */
  async bulkUpdateOrderRequestItems(
    orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
    userContext: UserContext,
    session: ClientSession,
  ) {
    return OrderRequestItemRepository.bulkUpdateOrderRequestItems(orderRequestItems, userContext, session);
  }

  async createOrderRequestItems(
    createOrderRequestItemsInput: Array<OrderRequestItemEntity.CreateOrderRequestItemInput>,
    userContext: UserContext,
    session: ClientSession,
  ): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    try {
      validateCreateOrderRequestItemsInput(createOrderRequestItemsInput);
      const parsedOrderRequestItems = await parseCreateOrderRequestItemsInput(createOrderRequestItemsInput, userContext);

      const createdOrderRequestItems = await OrderRequestItemRepository.createOrderRequestItems(
        parsedOrderRequestItems,
        session,
      );
      return createdOrderRequestItems;
    } catch (error: any) {
      logger.error({
        error,
        input: { createOrderRequestItemsInput, userContext },
        message: 'Error in createOrderRequestItems',
      });
      if (
        typeof error.message === 'string' &&
        RetriableMondoDBErrorMessageRegex.some((regex) => error.message.search(regex) >= 0)
      ) {
        throw new InternalRetriableError({
          where: `${__filename} - createOrderRequestItems`,
          message: error.message,
        });
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Please try again to create the order request items.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { createOrderRequestItemsInput },
        report: true,
        where: `${__filename} - ${this.createOrderRequestItems.name}`,
      });
    }
  }

  /**
   * @param {StringObjectID} orderRequestId
   * @param {number} tenantId
   * @param {ClientSession} session
   */
  async closeOrderRequestItemsOfOrderRequestWithinSession(
    { orderRequestId }: OrderRequestEntity.CloseOrderRequestInput,
    userContext: UserContext,
    session: ClientSession,
  ): Promise<Entity.MutationResponse> {
    try {
      const { orderRequestItems } = await this.getAllOrderRequestItems(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
        session,
      );
      validateCloseOrderRequestItemsInput(orderRequestItems);
      const updateOrderRequestItemRepositoryInputs: UpdateOrderRequestItemRepositoryInput[] = [];
      orderRequestItems.forEach(({ _id: orderRequestItemId, status, statusHistory }) => {
        if (
          [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
          ].includes(status)
        ) {
          updateOrderRequestItemRepositoryInputs.push({
            _id: orderRequestItemId,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
            statusHistory: statusHistory.concat([
              {
                createdAt: userContext.requestTimestamp,
                createdById: userContext.currentUserInfo._id,
                status: OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
                reason: 'Order is being closed to prevent any further update.',
              },
            ]),
          });
        }
      });
      await OrderRequestItemRepository.bulkUpdateOrderRequestItems(
        updateOrderRequestItemRepositoryInputs,
        userContext,
        session,
      );
      return { success: true };
    } catch (error: any) {
      logger.error({
        error,
        input: { orderRequestId, tenantId: userContext.tenantId },
        message: 'Error in closeOrderRequestItemsOfOrderRequest',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Failed to close order request items.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequestId },
        report: true,
        where: `${__filename} - ${this.closeOrderRequestItemsOfOrderRequestWithinSession.name}`,
      });
    }
  }

  async deleteOrderRequestItemsByItemIds(
    deleteOrderRequestItemsByItemIdsInput: OrderRequestItemEntity.DeleteOrderRequestItemsByItemIdsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    try {
      /* Fetching existing order request items for validation. */
      const existingOrderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItems({
        filters: {
          itemIds: deleteOrderRequestItemsByItemIdsInput.itemIds,
          statuses: [
            OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OUT_FOR_DELIVERY,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
            OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          ],
        },
      });
      /* Validating incoming order request items. */
      validateDeleteOrderRequestItems(existingOrderRequestItems);
      const session = await mongoose.startSession();

      await session.withTransaction(async () => {
        /* Cancelling order request items. */
        await OrderRequestItemRepository.deleteOrderRequestItems(
          existingOrderRequestItems.map((item) => item._id),
          userContext,
          session,
        );
        /** Cancelling order request items in parent tenant */
        const orderRequestItemIdInParentTenant = existingOrderRequestItems
          .map((item) => item.entityIdInSourceTenant)
          .filter((element) => !!element) as StringObjectID[];
        if (orderRequestItemIdInParentTenant.length > 0) {
          await OrderRequestItemRepository.deleteOrderRequestItems(orderRequestItemIdInParentTenant, userContext, session);
        }
      });
      return { success: true };
    } catch (error: any) {
      logger.error({
        error,
        input: { deleteOrderRequestItemsByItemIdsInput, userContext },
        message: 'Error in deleteOrderRequestItemsByItemIds',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Please try again to delete the order request item.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { deleteOrderRequestItemsByItemIdsInput },
        report: true,
        where: `${__filename} - ${this.deleteOrderRequestItemsByItemIds.name}`,
      });
    }
  }

  async deleteOrderRequestItemsByOrderRequestId(
    orderRequestId: StringObjectID,
    userContext: UserContext,
    session: ClientSession,
  ): Promise<Entity.MutationResponse> {
    try {
      /* Fetching existing order request items for validation. */
      const existingOrderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItems({
        filters: { orderRequestIds: [orderRequestId] },
      });
      /* Validating incoming order request items. */
      validateDeleteOrderRequestItems(existingOrderRequestItems);
      /* Cancelling order request items. */
      await OrderRequestItemRepository.deleteOrderRequestItems(
        existingOrderRequestItems.map((item) => item._id),
        userContext,
        session,
      );
      /** Cancelling order request items in parent tenant */
      const orderRequestItemIdInParentTenant = existingOrderRequestItems
        .map((item) => item.entityIdInSourceTenant)
        .filter((element) => !!element) as StringObjectID[];
      if (orderRequestItemIdInParentTenant.length > 0) {
        await OrderRequestItemRepository.deleteOrderRequestItems(orderRequestItemIdInParentTenant, userContext, session);
      }
      return { success: true };
    } catch (error: any) {
      logger.error({
        error,
        input: { orderRequestId, userContext },
        message: 'Error in deleteOrderRequestItemsByOrderRequestId',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Please try again to delete the order request item.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { orderRequestId },
        report: true,
        where: `${__filename} - ${this.deleteOrderRequestItemsByOrderRequestId.name}`,
      });
    }
  }

  async pushTrackingDetailsToCorrespondingOrderRequestItems(
    trackingDetailsByOrderRequestItemId: Record<string, OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]>,
    session?: ClientSession,
  ) {
    return OrderRequestItemRepository.pushTrackingDetailsToCorrespondingOrderRequestItems(
      trackingDetailsByOrderRequestItemId,
      session,
    );
  }

  async pushTransactionDetailsToCorrespondingOrderRequestItems(
    transactionDetailsByOrderRequestItemId: Record<
      string,
      OrderRequestItemEntity.OrderRequestItemTransactionDetailsSchema[]
    >,
    session?: ClientSession,
  ) {
    return OrderRequestItemRepository.pushTransactionDetailsToCorrespondingOrderRequestItems(
      transactionDetailsByOrderRequestItemId,
      session,
    );
  }

  async resendReturnedOrderRequestItemEmail(
    resendReturnedOrderRequestItemEmailInput: OrderRequestItemEntity.ResendReturnedOrderRequestItemEmailInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    try {
      const { orderRequestId, orderRequestItemId } = resendReturnedOrderRequestItemEmailInput;
      /* Fetching order request to check whether the current user has permission to access it or not. */
      const orderRequest = await OrderRequestServiceV2.getOrderRequestForReturn(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
      );
      if (!orderRequest) {
        throw new ForbiddenError({
          debugMessage: 'Unavailable/Inaccessible order request requested to resend return mail.',
          message: 'This order is not available. Please recheck the order or select a different order.',
          params: { resendReturnedOrderRequestItemEmailInput },
          where: `${__filename} - ${this.resendReturnedOrderRequestItemEmail.name}`,
        });
      }

      /* Fetching existing order request items for validation. */
      const { orderRequestItems: existingOrderRequestItems } = await this.getAllOrderRequestItems(
        {
          filters: { orderRequestItemIds: [orderRequestItemId] },
        },
        userContext,
      );
      /** Validating incoming orderRequestItemId. */
      validateResendReturnedOrderRequestItemEmail(existingOrderRequestItems[0]);

      /** Extracting trackingId from orderRequestItem. */
      const [trackingId] = existingOrderRequestItems[0].trackingDetails.map((trackingDetail) => trackingDetail.trackingId);
      await sendReturnOrderRequestItemEmailBasedOnTrackingId(orderRequest, trackingId, userContext);
      return { success: true };
    } catch (error: any) {
      logger.error({
        error,
        input: { resendReturnedOrderRequestItemEmailInput, userContext },
        message: 'Error in resendReturnedOrderRequestItemEmail',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: 'Please try again to resend return order request email.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { resendReturnedOrderRequestItemEmailInput },
        error,
        report: true,
        where: `${__filename} - ${this.resendReturnedOrderRequestItemEmail.name}`,
      });
    }
  }

  async returnOrderRequestItems(
    returnOrderRequestItemsInput: OrderRequestItemEntity.ReturnOrderRequestItemsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    const session = await mongoose.startSession();
    try {
      // await PermissionValidator.verifyReturnOrderPermissions(userContext);
      const { orderRequestId, returnedOrderRequestItems } = returnOrderRequestItemsInput;
      const orderRequestItemIds = returnedOrderRequestItems.map(({ _id }) => _id);
      /* Fetching order request to check whether the current user has permission to access it or not. */
      const [orderRequest, { orderRequestItems: eligibleOrderRequestItemsForReturn }] = await Promise.all([
        /* Fetching order request. */
        OrderRequestServiceV2.getOrderRequestForReturn({ filters: { orderRequestIds: [orderRequestId] } }, userContext),
        /* Fetching existing orderRequestItems */
        this.getAllOrderRequestItems(
          {
            filters: {
              orderRequestItemIds,
              statuses: [OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED],
            },
          },
          userContext,
        ),
      ]);

      if (!orderRequest) {
        throw new ForbiddenError({
          debugMessage: 'Unavailable/Inaccessible order request tried to return.',
          message: 'You are not allowed to return items of this order. Please check and try again',
          params: { returnOrderRequestItemsInput },
          where: `${__filename} - returnOrderRequestItems`,
        });
      }

      validateReturnOrderRequestItemsInput(
        returnOrderRequestItemsInput,
        orderRequest,
        eligibleOrderRequestItemsForReturn,
        userContext,
      );

      let eligibleOrderRequestItemsForReturnInParentTenant: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
      let orderRequestInParentTenant: OrderRequestEntity.OrderRequestSchema | undefined;

      if (orderRequest.parentTenantId && orderRequest.entityIdInSourceTenant) {
        const parentUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, orderRequest.parentTenantId);
        const [{ orderRequests }, { orderRequestItems: correspondingOrderRequestItems }] = await Promise.all([
          OrderRequestServiceV2.getAllOrderRequests(
            { filters: { orderRequestIds: [orderRequest.entityIdInSourceTenant] } },
            parentUserContext,
          ),
          /* Fetching existing orderRequestItems */
          this.getAllOrderRequestItems(
            {
              filters: {
                orderRequestItemIds: eligibleOrderRequestItemsForReturn.map(
                  ({ entityIdInSourceTenant }) => entityIdInSourceTenant,
                ) as StringObjectID[],
                statuses: [OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED],
              },
            },
            parentUserContext,
          ),
        ]);
        eligibleOrderRequestItemsForReturnInParentTenant = correspondingOrderRequestItems;
        [orderRequestInParentTenant] = orderRequests;
      }

      let trackingDetailsByOrderRequestItemId: Record<
        string,
        OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]
      > = {};

      await session.withTransaction(async () => {
        const { orderRequestItemsToCreate, orderRequestItemsToUpdate } = parseReturnedOrderRequestItems(
          returnedOrderRequestItems,
          eligibleOrderRequestItemsForReturn,
          userContext,
        );
        let orderRequestItemsToCreateInParentTenant: CreateOrderRequestItemRepositoryInput[] = [];
        let orderRequestItemsToUpdateInParentTenant: UpdateOrderRequestItemRepositoryInput[] = [];
        if (eligibleOrderRequestItemsForReturnInParentTenant.length > 0 && orderRequestInParentTenant) {
          const payload = parseReturnedOrderRequestItemsForParentTenant(
            eligibleOrderRequestItemsForReturnInParentTenant,
            eligibleOrderRequestItemsForReturn,
            orderRequestItemsToCreate,
            orderRequestItemsToUpdate,
          );
          orderRequestItemsToCreateInParentTenant = payload.orderRequestItemsToCreate;
          orderRequestItemsToUpdateInParentTenant = payload.orderRequestItemsToUpdate;
        }
        let createdOrderRequestItems: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [];
        let createdOrderRequestItemsInParentTenant: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [];
        const promises = [];
        if (orderRequestItemsToUpdate.length !== 0) {
          promises.push(
            OrderRequestItemRepository.bulkUpdateOrderRequestItems(orderRequestItemsToUpdate, userContext, session),
          );
        }
        if (orderRequestItemsToCreate.length !== 0) {
          createdOrderRequestItems = await OrderRequestItemRepository.createOrderRequestItems(
            orderRequestItemsToCreate,
            session,
          );
        }
        if (orderRequestItemsToUpdateInParentTenant.length !== 0) {
          promises.push(
            OrderRequestItemRepository.bulkUpdateOrderRequestItems(
              orderRequestItemsToUpdateInParentTenant,
              userContext,
              session,
            ),
          );
        }
        if (orderRequestItemsToCreateInParentTenant.length !== 0) {
          createdOrderRequestItemsInParentTenant = await OrderRequestItemRepository.createOrderRequestItems(
            orderRequestItemsToCreateInParentTenant,
            session,
          );
        }
        const updatedOrderRequestItems = orderRequestItemsToUpdate.map((orderRequestItem) => ({
          ...(eligibleOrderRequestItemsForReturn.find(
            (element) => element._id.toString() === orderRequestItem._id.toString(),
          ) as OrderRequestItemEntity.OrderRequestItemSchema),
          ...orderRequestItem,
        }));
        const updatedOrderRequestItemsInParentTenant = orderRequestItemsToUpdateInParentTenant.map((orderRequestItem) => ({
          ...(eligibleOrderRequestItemsForReturnInParentTenant.find(
            (element) => element._id.toString() === orderRequestItem._id.toString(),
          ) as OrderRequestItemEntity.OrderRequestItemSchema),
          ...orderRequestItem,
        }));
        await Promise.all(promises);

        const finalReturnedOrderRequestItemsInPackedStatus = [
          ...createdOrderRequestItems,
          ...updatedOrderRequestItems,
        ].filter((orderRequestItem) => orderRequestItem.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED);

        const orderRequestItemsReturnedInPackedStatusInParentTenant = [
          ...createdOrderRequestItemsInParentTenant,
          ...updatedOrderRequestItemsInParentTenant,
        ].filter((orderRequestItem) => orderRequestItem.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED);

        trackingDetailsByOrderRequestItemId = await packReturnedOrderRequestItemsIntoAContainer(
          orderRequest,
          finalReturnedOrderRequestItemsInPackedStatus,
          userContext,
        );

        if (orderRequestInParentTenant) {
          const trannsactionDetailsByOrderRequestItemIdInChildTenant = await createExternalOrderMoveTransactionForReturn(
            orderRequestInParentTenant,
            orderRequestItemsReturnedInPackedStatusInParentTenant,
            finalReturnedOrderRequestItemsInPackedStatus,
            trackingDetailsByOrderRequestItemId,
            userContext,
          );
          await this.pushTransactionDetailsToCorrespondingOrderRequestItems(
            trannsactionDetailsByOrderRequestItemIdInChildTenant,
            session,
          );
        }

        await this.pushTrackingDetailsToCorrespondingOrderRequestItems(trackingDetailsByOrderRequestItemId, session);
      });
      try {
        const trackingIds = Object.values(trackingDetailsByOrderRequestItemId).map(
          (trackingDetails) => trackingDetails[0].trackingId,
        );
        trackingIds.map((trackingId) =>
          sendReturnOrderRequestItemEmailBasedOnTrackingId(orderRequest, trackingId, userContext),
        );
      } catch (error) {
        logger.error({ error, message: 'Error in sending return notification.' });
      }
      return { success: true };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({
        error,
        input: { returnOrderRequestItemsInput, userContext },
        message: 'Error in returnOrderRequestItems',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Please try again to return items of this order.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { returnOrderRequestItemsInput },
        report: true,
        where: `${__filename} - ${this.returnOrderRequestItems.name}`,
      });
    } finally {
      await session.endSession();
    }
  }

  /** REWRITE NOTE: No permission check, to be called internally, never integrate permission check as there might be orders which are not accessible to user for editing because items could be packed through same trackingId as items of accessible order or shipment that is being unpacked. */
  async unpackOrderRequestItemsOfTrackingIds(
    unpackOrderRequestItemsOfTrackingIdsInput: OrderRequestItemEntity.UnpackOrderRequestItemsOfTrackingIdsInput,
    userContext: UserContext,
  ): Promise<void> {
    logger.debug({
      message: 'unpackOrderRequestItemsOfTrackingIds called',
      payload: { unpackOrderRequestItemsOfTrackingIdsInput },
    });
    const session = await mongoose.startSession();
    try {
      /* Fetch corresponding orderRequestItems */
      const { orderRequestItems } = await this.getAllOrderRequestItems(
        { filters: unpackOrderRequestItemsOfTrackingIdsInput },
        userContext,
      );

      /* Validate whether all the trackingDetails of orderRequestItems are in packed status. */
      validateUnpackOrderRequestItemsOfTrackingIds(unpackOrderRequestItemsOfTrackingIdsInput, orderRequestItems);

      /* Parse the orderRequestItem for updates from input. */
      const { orderRequestItemsToCreate, orderRequestItemsToUpdate } = await parseUnpackOrderRequestItemsOfTrackingIds(
        unpackOrderRequestItemsOfTrackingIdsInput,
        orderRequestItems,
        userContext,
      );

      /** Check whether any of these orderRequestItems are of external orderRequest */
      const orderRequestItemsOfChildTenants = await OrderRequestItemRepository.getAllOrderRequestItems({
        filters: { entityIdsInSourceTenant: orderRequestItems.map(({ _id }) => _id) },
      });

      let orderRequestItemsToCreateInChildTenants: CreateOrderRequestItemRepositoryInput[] = [];
      let orderRequestItemsToUpdateInChildTenants: UpdateOrderRequestItemRepositoryInput[] = [];
      let inTransitTransactionIdsToDeleteByChildTenantId: Record<string, StringObjectID[]> = {};
      if (orderRequestItemsOfChildTenants.length > 0) {
        const payload = await parseUnpackOrderRequestItemsOfParentTrackingIds(
          orderRequestItemsOfChildTenants,
          orderRequestItemsToCreate,
          orderRequestItemsToUpdate,
          userContext,
        );
        orderRequestItemsToCreateInChildTenants = payload.orderRequestItemsToCreate;
        orderRequestItemsToUpdateInChildTenants = payload.orderRequestItemsToUpdate;
        inTransitTransactionIdsToDeleteByChildTenantId = payload.inTransitTransactionIdsToDeleteByChildTenantId;
      }

      /* Store the newly created or updated orderRequestItem. */
      await session.withTransaction(async () => {
        await Promise.all([
          OrderRequestItemRepository.createOrderRequestItems(
            orderRequestItemsToCreate.concat(orderRequestItemsToCreateInChildTenants || []),
            session,
          ),
          OrderRequestItemRepository.bulkUpdateOrderRequestItems(
            orderRequestItemsToUpdate.concat(orderRequestItemsToUpdateInChildTenants || []),
            userContext,
            session,
          ),
        ]);

        for (const childTenantId of Object.keys(inTransitTransactionIdsToDeleteByChildTenantId)) {
          const childUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, childTenantId);
          await TransactionService.deleteInTransitTransactions(
            { transactionIds: inTransitTransactionIdsToDeleteByChildTenantId[childTenantId] },
            childUserContext,
          );
        }
      });
      const orderRequestIds = uniq(orderRequestItems.map(({ orderRequestId }) => orderRequestId.toString()));
      await Promise.all(
        orderRequestIds.map((orderRequestId) =>
          OrderRequestServiceV2.updateLeastItemStatus({ orderRequestId }, userContext),
        ),
      );
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in unpackOrderRequestItemsOfTrackingIds' });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * @param {OrderRequestEntity.UpdateOrderRequestInput} updateOrderRequestInput
   * @param {UserContext} userContext
   * @param {ClientSession} session
   * @returns {Array<OrderRequestItemEntity.OrderRequestItemSchema>}
   */
  async updateOrderRequestItems(
    updateOrderRequestInput: OrderRequestEntity.UpdateOrderRequestInput,
    orderRequest: OrderRequestEntity.OrderRequestSchema,
    userContext: UserContext,
    session: ClientSession,
  ): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    try {
      /** Fetching existing order request items for validation. */
      const existingOrderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItems({
        filters: { orderRequestIds: [updateOrderRequestInput.orderRequestId] },
      });
      /** Validating incoming order request items. */
      validateUpdateOrderRequestItemsInput(existingOrderRequestItems, updateOrderRequestInput);

      /** Parsing and separating updated and not updated order request items. */
      const { orderRequestItemsToUpdate, unmodifiedOrderRequestItems } = await parseUpdateOrderRequestItemsInput(
        existingOrderRequestItems,
        updateOrderRequestInput,
        userContext,
      );

      const modifiedOrderRequestItems = orderRequestItemsToUpdate.map((orderRequestItem) => ({
        ...(existingOrderRequestItems.find(
          (element) => element._id === orderRequestItem._id,
        ) as OrderRequestItemEntity.OrderRequestItemSchema),
        ...orderRequestItem,
      }));

      await OrderRequestItemRepository.bulkUpdateOrderRequestItems(orderRequestItemsToUpdate, userContext, session);
      sendOrderRequestUpdatedEmailForStatusUpdates(
        [
          {
            orderRequest,
            existingOrderRequestItems,
            modifiedOrderRequestItems,
          },
        ],
        userContext,
      );
      return modifiedOrderRequestItems.concat(unmodifiedOrderRequestItems || []);
    } catch (error: any) {
      logger.error({
        error,
        input: { updateOrderRequestInput, userContext },
        message: 'Error in updateOrderRequestItems',
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: 'Please try again to update the order request items.',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { updateOrderRequestInput },
        report: true,
        where: `${__filename} - ${this.updateOrderRequestItems.name}`,
      });
    }
  }

  async updateOrderRequestItemsStatusByItemRestockUpdates(
    updateOrderRequestItemsStatusByItemRestockUpdatesInput: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByItemRestockUpdatesInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<Entity.MutationResponse> {
    const session = await mongoose.startSession();
    try {
      const { itemRestockUpdates } = updateOrderRequestItemsStatusByItemRestockUpdatesInput;
      const restockedItemIds = uniq(itemRestockUpdates.map(({ itemId }) => itemId.toString()));
      const orderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItemsForRestockUpdates(
        {
          filters: {
            itemIds: restockedItemIds,
            statuses: [OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED],
          },
        },
        userContext,
      );

      const externalOrderRequestItems = await OrderRequestItemRepository.getAllOrderRequestItemsForRestockUpdates(
        {
          filters: {
            entityIdsInSourceTenant: orderRequestItems.map(({ _id }) => _id),
            statuses: [OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED],
          },
        },
        userContext,
      );

      if (orderRequestItems.length === 0) {
        return { success: true };
      }
      const orderRequestItemsToUpdate: UpdateOrderRequestItemRepositoryInput[] = [];
      orderRequestItems.forEach((item) => {
        orderRequestItemsToUpdate.push({
          _id: item._id,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          statusHistory: item.statusHistory.concat({
            createdAt: userContext.requestTimestamp,
            createdById: userContext.currentUserInfo._id,
            reason: `Item restocked in inventory by ${userContext.currentUserInfo.email}`,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          }),
          updatedAt: userContext.requestTimestamp,
          updatedById: userContext.currentUserInfo._id,
        });
      });
      externalOrderRequestItems.forEach((item) => {
        orderRequestItemsToUpdate.push({
          _id: item._id,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          statusHistory: item.statusHistory.concat({
            createdAt: userContext.requestTimestamp,
            createdById: userContext.currentUserInfo._id,
            reason: `Item restocked in inventory by ${userContext.currentUserInfo.email}`,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          }),
          updatedAt: userContext.requestTimestamp,
          updatedById: userContext.currentUserInfo._id,
        });
      });
      await session.withTransaction(async () => {
        logger.info({
          message: `Setting status of ${orderRequestItemsToUpdate.length} items to open for itemIds ${restockedItemIds}`,
        });
        await OrderRequestItemRepository.bulkUpdateOrderRequestItems(
          orderRequestItemsToUpdate.concat(externalOrderRequestItems || []),
          userContext,
          session,
        );

        if (orderRequestItems.length > 0) {
          const orderRequestIdsOfUpdatedItems = uniq(orderRequestItems.map(({ orderRequestId }) => orderRequestId));
          const promises = orderRequestIdsOfUpdatedItems.map((orderRequestId) => {
            /** Directly setting leastOrderItemStatus to open. */
            return OrderRequestServiceV2.updateLeastItemStatus(
              {
                leastItemStatus: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
                orderRequestId,
              },
              userContext,
              session,
            );
          });
          await Promise.all(promises);
        }
      });
      return { success: true };
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({
        error,
        message: 'Error in updateOrderRequestItemsStatusByItemRestockUpdates',
      });
      if (error.errmsg && error.errmsg === 'WriteConflict' && retryCount < 2) {
        await this.updateOrderRequestItemsStatusByItemRestockUpdates(
          updateOrderRequestItemsStatusByItemRestockUpdatesInput,
          userContext,
          retryCount + 1,
        );
      }
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: "Failed to update Order item's status.",
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { updateOrderRequestItemsStatusByItemRestockUpdatesInput },
        report: true,
        where: `${__filename} - ${this.updateOrderRequestItemsStatusByItemRestockUpdates.name}`,
      });
    } finally {
      await session.endSession();
    }
  }

  /** REWRITE NOTE: No permission check, to be called internally, never integrate permission check as there might be orders which are not accessible to user for editing because items could be packed through same trackingId as items of accessible order or shipment. */
  async updateOrderRequestItemsStatusByTrackingUpdates(
    updateOrderRequestItemsStatusByTrackingUpdatesInput: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    try {
      const { updates, deliveryVerificationDetails } = updateOrderRequestItemsStatusByTrackingUpdatesInput;
      const trackingIds = uniq(updates.map(({ trackingId }) => trackingId));
      const { orderRequestItems: correspondingOrderRequestItems } = await this.getAllOrderRequestItems(
        { filters: { trackingIds } },
        userContext,
      );

      const correspondingOrderRequestItemsInPartnerTenants = await OrderRequestItemRepository.getAllOrderRequestItems({
        filters: {
          _or: [
            /** Tracking updates that needs to be propagated to child tenants incase of delivering shipment. */
            { entityIdsInSourceTenant: correspondingOrderRequestItems.map(({ _id }) => _id) },
            /** Tracking updates that needs to be propagated to parent tenants incase of return shipment. */
            {
              orderRequestItemIds: correspondingOrderRequestItems
                .map(({ entityIdInSourceTenant }) => entityIdInSourceTenant)
                .filter((element) => !!element) as StringObjectID[],
            },
          ],
        },
      });

      /* Parsing tracking updates and applying it to the orderRequestItems and calculating status of it based on updated tracking details. */
      const { orderRequestItemsWithStatusUpdates, orderRequestItemsWithTrackingDetailsUpdates } =
        parseUpdateOrderRequestItemsStatusByTrackingUpdates(correspondingOrderRequestItems, updates, userContext);

      const {
        orderRequestItemsWithStatusUpdatesInPartnerTenant,
        orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant,
        transactionIdsToMarkComplete,
      } = parseUpdateOrderRequestItemsStatusByTrackingUpdatesInPartnerTenant(
        correspondingOrderRequestItemsInPartnerTenants,
        correspondingOrderRequestItems,
        orderRequestItemsWithStatusUpdates,
        updates,
        userContext,
      );

      logger.debug({
        message: `Updating status of ${orderRequestItemsWithStatusUpdates.length} items.`,
      });
      logger.debug({
        message: `Updating only trackingDetails of ${orderRequestItemsWithTrackingDetailsUpdates.length} items.`,
      });
      let correspondingOrderRequestIds: StringObjectID[] = [];
      let orderRequestItemsWithStatusUpdated: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
      const session = await mongoose.startSession();
      await session.withTransaction(async () => {
        await OrderRequestItemRepository.bulkUpdateOrderRequestItems(
          [
            ...orderRequestItemsWithStatusUpdates,
            ...orderRequestItemsWithTrackingDetailsUpdates,
            ...orderRequestItemsWithStatusUpdatesInPartnerTenant,
            ...orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant,
          ],
          userContext,
          session,
        );
        if (
          transactionIdsToMarkComplete.length > 0 &&
          (orderRequestItemsWithTrackingDetailsUpdatesInPartnerTenant.length > 0 ||
            orderRequestItemsWithStatusUpdatesInPartnerTenant.length > 0)
        ) {
          const parentUserContext = contextUserUtil.switchTenantForInternalUsage(
            userContext,
            correspondingOrderRequestItemsInPartnerTenants[0].tenantId,
          );
          await TransactionService.markMoveTransactionsComplete(
            { transactionIds: transactionIdsToMarkComplete },
            parentUserContext,
          );
        }
        orderRequestItemsWithStatusUpdated = orderRequestItemsWithStatusUpdates
          .concat(orderRequestItemsWithStatusUpdatesInPartnerTenant || [])
          .map((orderRequestItemUpdates) => ({
            ...(correspondingOrderRequestItems.find(
              (element) => element._id === orderRequestItemUpdates._id,
            ) as OrderRequestItemEntity.OrderRequestItemSchema),
            ...(correspondingOrderRequestItemsInPartnerTenants.find(
              (element) => element._id === orderRequestItemUpdates._id,
            ) as OrderRequestItemEntity.OrderRequestItemSchema),
            ...orderRequestItemUpdates,
          }));
        const orderRequestItemsWithStatusUpdatedByTenantId = groupBy(orderRequestItemsWithStatusUpdated, ({ tenantId }) =>
          tenantId.toString(),
        );
        for (const tenantId of Object.keys(orderRequestItemsWithStatusUpdatedByTenantId)) {
          const { [tenantId]: orderRequestItemsWithStatusUpdatedForCurrentTenant } =
            orderRequestItemsWithStatusUpdatedByTenantId;
          const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, tenantId);
          const correspondingOrderRequestIdsOfCurrentTenant = uniq(
            orderRequestItemsWithStatusUpdatedForCurrentTenant.map(({ orderRequestId }) => orderRequestId.toString()),
          );
          correspondingOrderRequestIds = correspondingOrderRequestIds.concat(correspondingOrderRequestIdsOfCurrentTenant);

          await scheduleCloseOrderRequests(correspondingOrderRequestIdsOfCurrentTenant, effectiveUserContext, session);
        }
      });

      await Promise.all(
        correspondingOrderRequestIds.map(async (orderRequestId) =>
          OrderRequestServiceV2.updateLeastItemStatus({ orderRequestId }, userContext),
        ),
      );

      try {
        /** Sending email for order request items delivered. */
        const orderRequestItemsWithDeliveredStatusUpdates = orderRequestItemsWithStatusUpdated.filter(
          ({ status }) => status === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        );
        if (orderRequestItemsWithDeliveredStatusUpdates.length !== 0) {
          const orderRequestIdsWithDeliveredOrderRequestItems = orderRequestItemsWithStatusUpdated.map(
            ({ orderRequestId }) => orderRequestId.toString(),
          );

          const { orderRequests: correspondingOrderRequests } = await OrderRequestServiceV2.getAllOrderRequestsAcrossTenants(
            { filters: { orderRequestIds: orderRequestIdsWithDeliveredOrderRequestItems } },
            userContext,
          );
          const deliveredOrderRequestItemsByOrderRequestId = groupBy(
            orderRequestItemsWithDeliveredStatusUpdates,
            ({ orderRequestId }) => orderRequestId.toString(),
          );
          const orderRequestEmailPayloads = await expandOrderEntities(
            correspondingOrderRequests.map((orderRequest) => ({
              deliveryAttachments: deliveryVerificationDetails,
              orderRequest,
              orderRequestItems: deliveredOrderRequestItemsByOrderRequestId[orderRequest._id.toString()],
            })),
            userContext,
          );
          for (const orderRequestEmailPayload of orderRequestEmailPayloads) {
            const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(
              userContext,
              orderRequestEmailPayload.tenantId,
            );
            EmailService.sendOrderRequestItemDeliveredNotification(
              orderRequestEmailPayload as DeliverNotificationPayloadInput,
              effectiveUserContext,
            );
          }
        }
        /** Sending order request status updated email to relevant officials of current tenant. */
        /** SUSPENDED TASK-> OR-531. */
        // const orderRequestItemsWithNonDeliveredStatusUpdates =
        //   orderRequestItemsWithStatusUpdated.filter(
        //     ({ status }) => status !== OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        //   );
        // if (orderRequestItemsWithNonDeliveredStatusUpdates.length !== 0) {
        //   const orderRequestIdsWithNonDeliveredOrderRequestItems =
        //     orderRequestItemsWithNonDeliveredStatusUpdates.map(({ orderRequestId }) =>
        //       orderRequestId.toString(),
        //     );

        //   const { orderRequests: correspondingOrderRequests } =
        //     await OrderRequestServiceV2.getAllOrderRequests(
        //       { filters: { orderRequestIds: orderRequestIdsWithNonDeliveredOrderRequestItems } },
        //       userContext,
        //     );
        //   const nonDeliveredOrderRequestItemsByOrderRequestId = groupBy(
        //     orderRequestItemsWithNonDeliveredStatusUpdates,
        //     ({ orderRequestId }) => orderRequestId,
        //   );
        //   const orderRequestEmailPayloads = await expandOrderEntities(
        //     correspondingOrderRequests.map((orderRequest) => ({
        //       orderRequest,
        //       orderRequestItems:
        //         nonDeliveredOrderRequestItemsByOrderRequestId[orderRequest._id.toString()],
        //     })),
        //     userContext.tenantId,
        //   );
        //   for (const orderRequestEmailPayload of orderRequestEmailPayloads) {
        //     EmailService.sendOrderRequestUpdatedNotification(
        //       orderRequestEmailPayload,
        //       userContext.tenantId,
        //     );
        //   }
        // }
      } catch (error) {
        logger.error({ error, message: 'Error in sending notification.' });
      }
      return { success: true };
    } catch (error: any) {
      logger.error({ error, message: 'Error in updateOrderRequestItemsStatusByTrackingUpdates' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: "Failed to update Order item's status.",
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { updateOrderRequestItemsStatusByTrackingUpdatesInput },
        report: true,
        where: `${__filename} - ${this.updateOrderRequestItemsStatusByTrackingUpdates.name}`,
      });
    }
  }

  async updateOrderRequestItemStatusByOrderRequestId(
    updateOrderRequestItemStatusByOrderRequestIdInput: OrderRequestItemEntity.UpdateOrderRequestItemStatusByOrderRequestIdInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<Entity.MutationResponse> {
    try {
      const {
        nonRemovableNote,
        orderRequestId,
        orderRequestItemId,
        status: updatedStatus,
      } = updateOrderRequestItemStatusByOrderRequestIdInput;
      /* Fetching order request to check whether the current user has permission to access it or not. */
      const orderRequest = await OrderRequestServiceV2.getOrderRequestForEditing(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
      );
      if (!orderRequest) {
        throw new ForbiddenError({
          debugMessage: 'Unavailable/Inaccessible order request tried to delete.',
          message: 'This order is not available. Please recheck the order or select a different order.',
          params: { updateOrderRequestItemStatusByOrderRequestIdInput },
          where: `${__filename} - updateOrderRequestItemStatusByOrderRequestId`,
        });
      } else if (orderRequest.entitySource === Entity.EntitySourceEnum.EXTERNAL) {
        throw new ForbiddenError({
          debugMessage: 'Status of items of external order request cannot be updated internally.',
          message:
            'You are not authorized to change the status of this order. Please contact an administrator for assistance.',
          params: { orderRequest },
          where: `${__filename} - updateOrderRequestItemStatusByOrderRequestId`,
        });
      }
      const { orderRequestItems: existingOrderRequestItems } = await this.getAllOrderRequestItems(
        { filters: { orderRequestIds: [orderRequestId] } },
        userContext,
      );

      /* Validates the incoming item's status against the valid possible sequence for order item status. */
      validateUpdateOrderRequestItemStatusByOrderRequestId(
        existingOrderRequestItems,
        updateOrderRequestItemStatusByOrderRequestIdInput,
      );

      /** If incoming status does not require any dependent actions. */
      if (OrderRequestItemStatusWithNoDependentActionRequired.includes(updatedStatus)) {
        let updatedOrderRequestItem: OrderRequestItemEntity.OrderRequestItemSchema | null | undefined;
        let orderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema | undefined;
        if (orderRequest.childTenantId) {
          const childUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, orderRequest.childTenantId);
          const { orderRequests } = await OrderRequestServiceV2.getAllOrderRequests(
            { filters: { entityIdsInSourceTenant: [orderRequest._id] } },
            childUserContext,
          );
          [orderRequestInChildTenant] = orderRequests;
        }
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            updatedOrderRequestItem = await OrderRequestItemRepository.updateOrderRequestItemStatus(
              {
                nonRemovableNote,
                orderRequestItemId,
                status: updatedStatus,
                statusHistory: {
                  createdAt: userContext.requestTimestamp,
                  createdById: userContext.currentUserInfo._id,
                  reason: 'Manual status update',
                  status: updatedStatus,
                },
                updatedById: userContext.currentUserInfo._id,
              },
              session,
            );

            if (updatedOrderRequestItem && orderRequest.childTenantId) {
              const [correspondingOrderRequestItemInChildTenant] = await OrderRequestItemRepository.getAllOrderRequestItems(
                {
                  filters: {
                    entityIdsInSourceTenant: [updatedOrderRequestItem._id],
                  },
                },
                undefined,
                session,
              );
              await OrderRequestItemRepository.updateOrderRequestItemStatus(
                {
                  nonRemovableNote,
                  orderRequestItemId: correspondingOrderRequestItemInChildTenant._id,
                  status: updatedStatus,
                  statusHistory: {
                    createdAt: userContext.requestTimestamp,
                    createdById: userContext.currentUserInfo._id,
                    reason: 'Manual status update',
                    status: updatedStatus,
                  },
                  updatedById: userContext.currentUserInfo._id,
                },
                session,
              );
            }

            /**
             * Close Order Request if new state is either close or cancelled and all other items are already closed or cancelled.
             */
            if (
              updatedStatus === OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED &&
              shouldCancelOrderRequest(existingOrderRequestItems)
            ) {
              await OrderRequestServiceV2.cancelOrderRequest(orderRequestId, userContext, session);
              if (orderRequestInChildTenant) {
                const childUserContext = contextUserUtil.switchTenantForInternalUsage(
                  userContext,
                  orderRequestInChildTenant.tenantId,
                );
                await OrderRequestServiceV2.cancelOrderRequest(orderRequestInChildTenant._id, childUserContext, session);
              }
            } else {
              const updatedOrderRequestItems = existingOrderRequestItems.map((orderRequestItem) => {
                if (orderRequestItem._id.toString() === updatedOrderRequestItem?._id.toString()) {
                  return updatedOrderRequestItem;
                }
                return orderRequestItem;
              });
              const { plan, referenceTimestamp } = shouldCloseOrderRequest(updatedOrderRequestItems);
              if (plan === OrderRequestEntity.OrderRequestClosePlanEnum.CLOSE) {
                await OrderRequestServiceV2.closeOrderRequestWithinSessionTransaction(
                  { orderRequestId },
                  userContext,
                  session,
                );
                if (orderRequestInChildTenant) {
                  const childUserContext = contextUserUtil.switchTenantForInternalUsage(
                    userContext,
                    orderRequestInChildTenant.tenantId,
                  );
                  await OrderRequestServiceV2.closeOrderRequestWithinSessionTransaction(
                    { orderRequestId: orderRequestInChildTenant._id },
                    childUserContext,
                    session,
                  );
                }
              } else if (
                plan === OrderRequestEntity.OrderRequestClosePlanEnum.SCHEDULE_CLOSE &&
                !orderRequest.scheduleId &&
                referenceTimestamp
              ) {
                scheduleOrderRequestForClosing(orderRequestId, userContext, referenceTimestamp);
                if (orderRequestInChildTenant) {
                  const childUserContext = contextUserUtil.switchTenantForInternalUsage(
                    userContext,
                    orderRequestInChildTenant.tenantId,
                  );
                  scheduleOrderRequestForClosing(orderRequestId, childUserContext, referenceTimestamp);
                }
              }
            }
            await OrderRequestServiceV2.updateLeastItemStatus({ orderRequestId }, userContext, session);
            if (orderRequestInChildTenant) {
              await OrderRequestServiceV2.updateLeastItemStatus(
                { orderRequestId: orderRequestInChildTenant._id },
                userContext,
                session,
              );
            }
          });
        } catch (error: any) {
          if (session.inTransaction()) {
            await session.abortTransaction();
          }
          logger.error({
            error,
            message: 'Error in updateOrderItemStatus with no dependent action',
          });
          if (error.errmsg && error.errmsg === 'WriteConflict' && retryCount < 2) {
            await this.updateOrderRequestItemStatusByOrderRequestId(
              updateOrderRequestItemStatusByOrderRequestIdInput,
              userContext,
              retryCount + 1,
            );
          }
          throw error;
        } finally {
          await session.endSession();
        }
        sendOrderRequestUpdatedEmailForStatusUpdates(
          [
            {
              orderRequest,
              existingOrderRequestItems,
              modifiedOrderRequestItems: [updatedOrderRequestItem as OrderRequestItemEntity.OrderRequestItemSchema],
            },
          ],
          userContext,
        );
      } else if (OrderRequestItemStatusWithDependentActionRequired.includes(updatedStatus)) {
        if (orderRequest.parentTenantId && updatedStatus === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED) {
          throw new ValidationError({
            debugMessage: 'You are not authorized to deliver this order. Please contact an administrator for assistance.',
            message: 'You are not authorized to deliver this order. Please contact an administrator for assistance.',
            params: { updateOrderRequestItemStatusByOrderRequestIdInput },
            where: `${__filename} - ${this.updateOrderRequestItemStatusByOrderRequestId.name}`,
          });
        } else if (
          orderRequest.childTenantId &&
          updatedStatus === OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED
        ) {
          throw new ValidationError({
            debugMessage: 'You are not authorized to return this order. Please contact an administrator for assistance.',
            message: 'You are not authorized to return this order. Please contact an administrator for assistance.',
            params: { updateOrderRequestItemStatusByOrderRequestIdInput },
            where: `${__filename} - ${this.updateOrderRequestItemStatusByOrderRequestId.name}`,
          });
        }
        const correspondingOrderRequestItem = existingOrderRequestItems.find(
          (item) => item._id.toString() === orderRequestItemId,
        );
        if (correspondingOrderRequestItem) {
          /* Extracting out in transit trackingIds from the updated item. */
          const trackingIdsOfItem = correspondingOrderRequestItem.trackingDetails
            .filter(
              (trackingDetail) =>
                trackingDetail.status !== ShippingTransactionEntity.ShippingTransactionStatusEnum.DELIVERED,
            )
            .map((trackingDetail) => trackingDetail.trackingId);
          if (trackingIdsOfItem.length > 0) {
            /* Calling shipping service to mark the relevant containers delivered. */
            await ShippingTransactionService.markShippingTransactionsOfTrackingIdsAsDelivered(
              { trackingIds: trackingIdsOfItem },
              userContext,
            );
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      logger.error({ error, message: 'Error in updateOrderRequestItemStatusByOrderRequestId' });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        error,
        debugMessage: "Failed to update Order item's status.",
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { updateOrderRequestItemStatusByOrderRequestIdInput },
        report: true,
        where: `${__filename} - ${this.updateOrderRequestItemStatusByOrderRequestId.name}`,
      });
    }
  }
}

export const OrderRequestItemServiceV2 = new OrderRequestItemServiceClass();
