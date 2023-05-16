import { logger } from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  RoleEntity,
  ScheduledJobEntity,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { addDays } from 'date-fns';
import { uniq } from 'lodash';
import { ClientSession } from 'mongoose';
import { appConfigs } from '../../../appConfigs';
import { RoleService, ScheduledJobService } from '../../../transport/__grpc/client/services';
import { contextUserUtil } from '../../../utils/userAuthentication/contextUser.util';
import { OrderRequestItemServiceV2 } from '../../orderRequestItem/orderRequestItem.service';
import { OrderRequestServiceV2 } from '../orderRequest.service';

const { ActorTypeEnum } = Entity;

const _getDateDifference = (dateOne: string | Date | number, dateTwo: string | Date | number) =>
  Math.abs(new Date(dateOne).getTime() - new Date(dateTwo).getTime());

const _getRolesWithAllowedScope = async (userContext: UserContext) => {
  const { roles } = await RoleService.getAllRoles(
    {
      filters: {
        allowedScopedEntities: [RoleEntity.AllowedScopeEntityEnum.CATEGORY, RoleEntity.AllowedScopeEntityEnum.SITE],
        types: [RoleEntity.RoleTypeEnum.CUSTOM, RoleEntity.RoleTypeEnum.SYSTEM, RoleEntity.RoleTypeEnum.HIDDEN],
      },
    },
    userContext,
  );
  return roles;
};

export const shouldCloseOrderRequest = (
  orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[],
): { plan: OrderRequestEntity.OrderRequestClosePlanEnum; referenceTimestamp?: string } => {
  const isOrderEligibleForClosedStatus = orderRequestItems.every((orderRequestItem) =>
    [
      OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
      OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
      OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
      OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
    ].includes(orderRequestItem.status),
  );
  if (isOrderEligibleForClosedStatus) {
    let lastProcessedItem: OrderRequestItemEntity.OrderRequestItemSchema | undefined;
    let areAllItemsAlreadyClosed = true;
    let hasAllItemsReachedDestination = true;
    let lastProcessedItemDeliveredStatusHistory: OrderRequestItemEntity.OrderRequestItemStatusHistorySchema | undefined;
    orderRequestItems.forEach((item) => {
      if (
        areAllItemsAlreadyClosed &&
        ![
          OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
        ].includes(item.status)
      ) {
        areAllItemsAlreadyClosed = false;
      }
      if (
        [
          OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
          OrderRequestItemEntity.OrderRequestItemStatusEnum.RETURNED,
        ].includes(item.status)
      ) {
        const deliveredStatusHistory = item.statusHistory.find(
          (history) => history.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.DELIVERED,
        );
        if (
          deliveredStatusHistory &&
          (!lastProcessedItem ||
            !lastProcessedItemDeliveredStatusHistory ||
            lastProcessedItemDeliveredStatusHistory.createdAt < deliveredStatusHistory.createdAt)
        ) {
          lastProcessedItem = item;
          lastProcessedItemDeliveredStatusHistory = deliveredStatusHistory;
        }
        return;
      }
      hasAllItemsReachedDestination = false;
    });
    if (areAllItemsAlreadyClosed) {
      logger.info({
        message: `Order with orderId ${orderRequestItems[0].orderRequestId} should be closed.`,
      });
      return { plan: OrderRequestEntity.OrderRequestClosePlanEnum.CLOSE };
    }
    if (!lastProcessedItem || !lastProcessedItemDeliveredStatusHistory) {
      logger.info({
        message: `Order with orderId ${orderRequestItems[0].orderRequestId} cannot be closed.`,
      });
      return { plan: OrderRequestEntity.OrderRequestClosePlanEnum.NOT_ELIGIBLE };
    }
    // Check if days between lastProcessedItem's delivery date and today's date is more than 30 or not
    if (
      hasAllItemsReachedDestination &&
      _getDateDifference(lastProcessedItemDeliveredStatusHistory.createdAt, new Date()) > 2592000000
    ) {
      logger.info({
        message: `Order with orderId ${orderRequestItems[0].orderRequestId} should be closed.`,
      });
      return { plan: OrderRequestEntity.OrderRequestClosePlanEnum.CLOSE };
    }
    logger.info({
      message: `Order with orderId ${orderRequestItems[0].orderRequestId} should be closed in future.`,
    });
    return {
      plan: OrderRequestEntity.OrderRequestClosePlanEnum.SCHEDULE_CLOSE,
      referenceTimestamp:
        lastProcessedItemDeliveredStatusHistory.createdAt instanceof Date
          ? lastProcessedItemDeliveredStatusHistory.createdAt.toISOString()
          : lastProcessedItemDeliveredStatusHistory.createdAt,
    };
  }
  logger.info({
    message: `Order with orderId ${orderRequestItems[0].orderRequestId} cannot be closed as not all items are closed.`,
  });
  return { plan: OrderRequestEntity.OrderRequestClosePlanEnum.NOT_ELIGIBLE };
};

export const shouldCancelOrderRequest = (orderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[]): boolean => {
  return orderRequestItems.every(
    (orderItem) => orderItem.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
  );
};

export const scheduleOrderRequestForClosing = async (
  orderRequestId: StringObjectID,
  userContext: UserContext,
  referenceTimestamp: string | Date,
  session?: ClientSession,
): Promise<StringObjectID> => {
  logger.info({
    message: `Scheduling closing of ${orderRequestId} orderRequestId for ${userContext.tenantId} tenant`,
  });
  const scheduleAt = addDays(new Date(referenceTimestamp), 30).toISOString();

  const { scheduledJobId } = await ScheduledJobService.createScheduledJob(
    {
      invocationType: ScheduledJobEntity.InvocationTypeEnum.GRPC,
      scheduledAt: scheduleAt,
      tenantId: userContext.tenantId,
      grpcMetadata: {
        recipientService: ScheduledJobEntity.RecipientServiceEnum.ORDER_REQUEST,
        rpcInput: JSON.stringify({ orderRequestId }),
        rpcMethod: 'closeOrderRequest',
      },
      recurring: false,
    },
    userContext,
  );

  await OrderRequestServiceV2.updateScheduleId(orderRequestId, scheduledJobId, userContext, session);
  return scheduledJobId;
};

export const scheduleCloseOrderRequests = async (
  orderRequestIds: StringObjectID[],
  userContext: UserContext,
  session?: ClientSession,
): Promise<void> => {
  if (orderRequestIds.length === 0) {
    return;
  }
  const [{ orderRequestItems }, { orderRequests }] = await Promise.all([
    OrderRequestItemServiceV2.getAllOrderRequestItems({ filters: { orderRequestIds } }, userContext, session),
    OrderRequestServiceV2.getAllOrderRequests({ filters: { orderRequestIds } }, userContext, session),
  ]);
  for (let index = 0; index < orderRequestIds.length; index++) {
    const { [index]: currentOrderRequestId } = orderRequestIds;
    const currentOrderRequest = orderRequests.find(
      ({ _id: orderRequestId }) => orderRequestId.toString() === currentOrderRequestId.toString(),
    );
    const orderRequestItemsOfOrderRequest = orderRequestItems.filter(
      ({ orderRequestId }) => orderRequestId.toString() === currentOrderRequestId.toString(),
    );
    const { plan, referenceTimestamp } = shouldCloseOrderRequest(orderRequestItemsOfOrderRequest);
    if (plan === OrderRequestEntity.OrderRequestClosePlanEnum.CLOSE) {
      await OrderRequestServiceV2.closeOrderRequest({ orderRequestId: currentOrderRequestId }, userContext);
      if (currentOrderRequest && currentOrderRequest.childTenantId) {
        const childUserContext = contextUserUtil.switchTenantForInternalUsage(
          userContext,
          currentOrderRequest.childTenantId,
        );
        const {
          orderRequests: [orderRequestInChildTenant],
        } = await OrderRequestServiceV2.getAllOrderRequests(
          { filters: { entityIdsInSourceTenant: [currentOrderRequestId] } },
          childUserContext,
          session,
        );
        await OrderRequestServiceV2.closeOrderRequest({ orderRequestId: orderRequestInChildTenant._id }, childUserContext);
      }
    } else if (
      plan === OrderRequestEntity.OrderRequestClosePlanEnum.SCHEDULE_CLOSE &&
      !currentOrderRequest?.scheduleId &&
      referenceTimestamp
    ) {
      await scheduleOrderRequestForClosing(currentOrderRequestId, userContext, referenceTimestamp, session);
      if (currentOrderRequest?.childTenantId) {
        const childUserContext = contextUserUtil.switchTenantForInternalUsage(
          userContext,
          currentOrderRequest?.childTenantId,
        );
        const {
          orderRequests: [orderRequestInChildTenant],
        } = await OrderRequestServiceV2.getAllOrderRequests(
          { filters: { entityIdsInSourceTenant: [currentOrderRequestId] } },
          childUserContext,
          session,
        );
        await scheduleOrderRequestForClosing(orderRequestInChildTenant._id, childUserContext, referenceTimestamp, session);
      }
    }
  }
};

export const getPermissionStringsForOrder = async (
  orderRequestMutationInput: OrderRequestEntity.CreateOrderRequestInput,
  userContext: UserContext,
  existingOrderRequest?: OrderRequestEntity.OrderRequestSchema,
): Promise<string[]> => {
  const {
    currentUserInfo: { _id: currentUserId },
  } = userContext;
  let creatorUserId = currentUserId;
  if (existingOrderRequest) {
    creatorUserId = existingOrderRequest.createdById;
  }
  const { deliverToId } = orderRequestMutationInput;
  const applicableRoles = await _getRolesWithAllowedScope(userContext);
  const siteIdsOfOrder = [orderRequestMutationInput.destinationSiteId, orderRequestMutationInput.billToSiteId];
  const categoryIdsOfOrder = orderRequestMutationInput.items
    .map(({ categoryId }) => categoryId?.toString())
    .filter((categoryId) => !!categoryId) as StringObjectID[];
  const permissionStrings: string[] = uniq([
    `${ActorTypeEnum.USER}/${creatorUserId.toString()}/${ActorTypeEnum.ROLE}/${appConfigs.creatorRoleId}`,
    `${ActorTypeEnum.USER}/${(deliverToId || creatorUserId).toString()}/${ActorTypeEnum.ROLE}/${appConfigs.creatorRoleId}`,
  ]);
  applicableRoles.forEach((role) => {
    if (role.allowedScopes.some((allowedScope) => allowedScope.scope === RoleEntity.AllowedScopeEntityEnum.CATEGORY)) {
      permissionStrings.push(
        ...categoryIdsOfOrder.map(
          (categoryId) => `${ActorTypeEnum.SCOPE_GROUP}/${categoryId}/${ActorTypeEnum.ROLE}/${role._id.toString()}`,
        ),
      );
    }
    if (role.allowedScopes.some((allowedScope) => allowedScope.scope === RoleEntity.AllowedScopeEntityEnum.SITE)) {
      permissionStrings.push(
        ...siteIdsOfOrder.map(
          (siteId) => `${ActorTypeEnum.SCOPE_GROUP}/${siteId}/${ActorTypeEnum.ROLE}/${role._id.toString()}`,
        ),
      );
    }
  });
  return uniq(permissionStrings);
};
