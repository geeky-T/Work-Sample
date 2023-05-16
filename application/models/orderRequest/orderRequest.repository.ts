import { CreateOrderRequestRepositoryInput, UpdateOrderRequestRepositoryInput } from '@custom-types/OrderRequest';
import { ErrorCodeEnum, logger, ResourceNotFoundError, StatusCodes } from '@procurenetworks/backend-utils';
import {
  BaseCrudService,
  convertSortPropsToMongoQuery,
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  PaginationUtil,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import mongoose, { ClientSession, FilterQuery, Types, UpdateQuery } from 'mongoose';
import { OrderRequestAbility } from './orderRequest.ability';
import { buildGetOrderRequestsFilterQuery } from './utils/buildFilterQuery';
import { buildGetOrderRequestsReportFilterQuery } from './utils/buildReportFilterQuery';
import { buildUpdateOrderRequestQuery } from './utils/buildUpdateQuery';

class OrderRequestRepositoryClass extends BaseCrudService<
  typeof OrderRequestEntity.OrderRequestSchema,
  typeof OrderRequestAbility
> {
  constructor() {
    super({
      ability: OrderRequestAbility,
      entityClass: OrderRequestEntity.OrderRequestSchema,
      mongooseConnection: mongoose.connection,
      schemaOptions: { collection: 'orderRequests' },
    });
  }

  /* Queries */
  async getOrderRequestForAction(
    { disableBaseFilter = false, filters, projection }: OrderRequestEntity.GetAllOrderRequestsInput,
    action: OrderRequestEntity.OrderRequestActionsEnum,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return undefined;
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
        tenantId: userContext.tenantId,
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const orderRequest = await this.findOne({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
      filterQuery: { ...filterQuery, ...baseFilterQuery },
      projection,
    });
    return orderRequest;
  }

  async getAllOrderRequests(
    { disableBaseFilter = false, filters, projection, sorts }: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema>> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return [];
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
        tenantId: userContext.tenantId,
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const orderRequests = await this.findAll({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      filterQuery: { ...baseFilterQuery, ...filterQuery },
      sortQuery: convertSortPropsToMongoQuery(sorts),
      options: { session },
      projection,
    });
    return orderRequests;
  }

  async getAllOrderRequestsAcrossTenants(
    { disableBaseFilter = false, filters, projection }: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema>> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return [];
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const orderRequests = await this.findAll({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      filterQuery: { ...baseFilterQuery, ...filterQuery },
      projection,
      options: { session },
    });
    return orderRequests;
  }

  async getPaginatedOrderRequests(
    { disableBaseFilter = false, filters, paginationProps, projection }: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.PaginatedOrderRequestsPayload> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return {
        success: true,
        edges: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPrevPage: false },
      };
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
        tenantId: userContext.tenantId,
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const orderRequestPaginationUtil = new PaginationUtil<OrderRequestEntity.OrderRequestSchema>(
      { ...filterQuery, ...baseFilterQuery },
      paginationProps,
    );
    const paginatedFilterQuery = orderRequestPaginationUtil.getPaginationFilterQuery();
    const paginatedSortQuery = orderRequestPaginationUtil.getSortQuery();
    const { limit } = paginationProps;
    const [orderRequests, orderRequestsCount] = await Promise.all([
      this.find({
        acl: {
          permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
          userContext,
        },
        filterQuery: paginatedFilterQuery,
        sortQuery: paginatedSortQuery,
        projection,
        limit: limit + 1,
      }),
      this.countDocuments({
        acl: {
          permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
          userContext,
        },
        filterQuery: { ...filterQuery, ...baseFilterQuery },
      }),
    ]);
    return orderRequestPaginationUtil.getPaginatedResponse(orderRequests, orderRequestsCount);
  }

  async getOrderRequestsCount(
    { disableBaseFilter = false, filters }: OrderRequestEntity.GetAllOrderRequestsInput,
    userContext: UserContext,
  ): Promise<number> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return 0;
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
        tenantId: userContext.tenantId,
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    return this.countDocuments({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      filterQuery: { ...filterQuery, ...baseFilterQuery },
    });
  }

  async getDistinctValuesForAllOrderRequests<T extends keyof OrderRequestEntity.OrderRequestSchema>(
    { disableBaseFilter = false, filters }: OrderRequestEntity.GetAllOrderRequestsInput,
    field: T,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema[T][]> {
    if (disableBaseFilter && Object.keys(filters).length === 0) {
      return [];
    }
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
    if (!disableBaseFilter) {
      baseFilterQuery = {
        deletedAt: { $exists: false },
        tenantId: userContext.tenantId,
      };
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const distinctValues = await this.distinct<T>({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      field,
      filterQuery: {
        ...filterQuery,
        ...baseFilterQuery,
      },
    });
    return distinctValues as OrderRequestEntity.OrderRequestSchema[T][];
  }

  async getPaginatedOrderRequestsDeprecated(
    { disableBaseFilter = false, filters, paginationProps, projection }: OrderRequestEntity.GetPaginatedOrderRequestsInput,
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema>> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {
      deletedAt: { $exists: false },
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const { limit = 10, skip = 0, sortField = '_id', sortOrder = Entity.SortOrderEnum.DESC } = paginationProps;
    const orderRequests = await this.find({
      filterQuery: { ...filterQuery, ...baseFilterQuery },
      limit,
      offset: skip,
      projection,
      sortQuery: { [sortField]: sortOrder === Entity.SortOrderEnum.DESC ? -1 : 1 },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
    });
    return orderRequests;
  }

  async getOrderRequest(
    { disableBaseFilter = false, filters, projection }: OrderRequestEntity.GetOrderRequestInput,
    userContext: UserContext,
  ): Promise<OrderRequestEntity.OrderRequestSchema | null | undefined> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {
      deletedAt: { $exists: false },
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = await buildGetOrderRequestsFilterQuery(filters, userContext);
    const orderRequest = await this.findOne({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      filterQuery: { ...filterQuery, ...baseFilterQuery },
      projection,
    });
    return orderRequest;
  }

  async getOrderRequestsForReport(
    filters: OrderRequestEntity.OrderRequestReportFiltersV2,
    userContext: UserContext,
  ): Promise<Array<OrderRequestEntity.OrderRequestSchema>> {
    const baseFilterQuery: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {
      deletedAt: { $exists: false },
      tenantId: userContext.tenantId,
    };
    const filterQuery = await buildGetOrderRequestsReportFilterQuery(filters);
    const orderRequests = await this.findAll({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.READ },
        userContext,
      },
      filterQuery: { ...filterQuery, ...baseFilterQuery },
    });
    return orderRequests;
  }

  /* Mutations */
  /** System call */
  async attachAvailableAtSiteIds(
    attachAvailableAtSiteIdsInput: Array<OrderRequestEntity.AttachAvailableAtSiteIdsInput>,
  ): Promise<void> {
    const bulkUpdateRequests = attachAvailableAtSiteIdsInput.map((order) => ({
      updateOne: {
        filter: { _id: order.orderRequestId as Types.ObjectId },
        update: {
          $set: {
            availableAtSiteIds: order.siteIds.map((siteId) => new mongoose.Types.ObjectId(siteId)),
            leastItemStatus:
              order.siteIds.length !== 0
                ? OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN
                : OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
          },
        },
      },
    }));
    if (bulkUpdateRequests.length !== 0) {
      await mongoose.connection.db.collection('orderRequests').bulkWrite(bulkUpdateRequests);
    }
  }

  async blockOrderRequest(
    orderRequestId: StringObjectID,
    blockedStatus: OrderRequestEntity.OrderRequestBlockedStatusSchema,
    userContext: UserContext,
    orderRequestVersion = 0,
  ): Promise<boolean> {
    const result = await this.updateMany({
      filterQuery: {
        __v: orderRequestVersion,
        _id: orderRequestId,
        tenantId: userContext.tenantId,
      },
      updateQuery: { $inc: { __v: 1 }, $set: { blockedStatus } },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
    });
    if (result.modifiedCount === 0) {
      return false;
    }
    return true;
  }

  async createOrderRequest(
    orderRequest: CreateOrderRequestRepositoryInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.OrderRequestSchema> {
    const [createdOrderRequest] = await this.insertMany({
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.CREATE },
        userContext,
      },
      docs: [orderRequest],
      options: {
        session,
      },
    });

    return createdOrderRequest;
  }

  async closeOrderRequest(
    orderRequestId: StringObjectID,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    const orderRequest = await this.findOneAndUpdate({
      filterQuery: {
        _id: orderRequestId,
        status: { $ne: OrderRequestEntity.OrderRequestStatusEnum.CLOSED },
        tenantId: userContext.tenantId,
      },
      updateQuery: {
        $set: {
          leastItemStatus: OrderRequestItemEntity.OrderRequestItemStatusEnum.CLOSED,
          status: OrderRequestEntity.OrderRequestStatusEnum.CLOSED,
        },
      },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
      options: { new: true, session },
    });
    return orderRequest;
  }

  async deleteOrderRequest(
    { orderRequestId }: OrderRequestEntity.DeleteOrderRequestInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    return this.findOneAndUpdate({
      filterQuery: { _id: orderRequestId },
      updateQuery: {
        deletedAt: new Date().toISOString(),
        deletedById: userContext.currentUserInfo._id,
        leastItemStatus: OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
        status: OrderRequestEntity.OrderRequestStatusEnum.CLOSED,
      },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.DELETE },
        userContext,
      },
      options: { session },
    });
  }

  async unblockOrderRequest(orderRequestId: StringObjectID, userContext: UserContext): Promise<boolean> {
    const result = await this.updateMany({
      filterQuery: {
        _id: orderRequestId,
        'blockedStatus.blockedBy': userContext.currentUserInfo._id,
        tenantId: userContext.tenantId,
      },
      updateQuery: { $inc: { __v: 1 }, $unset: { blockedStatus: 1 } },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
    });
    if (result.modifiedCount === 0) {
      return false;
    }
    return true;
  }

  async updateFulfillingSites(
    orderRequestId: StringObjectID,
    fulfillingSiteId: StringObjectID,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<void> {
    await this.updateMany({
      filterQuery: { _id: orderRequestId },
      updateQuery: { $addToSet: { fulfillingSiteIds: fulfillingSiteId } },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
      options: { session },
    });
  }

  async updateOrderRequest(
    orderRequestId: StringObjectID,
    updates: UpdateOrderRequestRepositoryInput,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<OrderRequestEntity.OrderRequestSchema | undefined> {
    try {
      const updateOrderRequestUpdateQuery = buildUpdateOrderRequestQuery(updates, userContext);

      const updateOrderRequestFilterQuery = await buildGetOrderRequestsFilterQuery(
        {
          orderRequestIds: [orderRequestId],
          statuses: [OrderRequestEntity.OrderRequestStatusEnum.ACTIVE],
        },
        userContext,
      );

      const updatedOrderRequest = await this.findOneAndUpdate({
        acl: {
          permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
          userContext,
        },
        filterQuery: updateOrderRequestFilterQuery,
        updateQuery: updateOrderRequestUpdateQuery,
        options: { session, new: true },
      });

      if (!updatedOrderRequest) {
        throw new ResourceNotFoundError({
          errorCode: ErrorCodeEnum.RESOURCE_NOT_FOUND,
          httpStatus: StatusCodes.NOT_FOUND,
          debugMessage: `Failed to updateOrderRequest`,
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          where: `${__filename} - ${this.updateOrderRequest.name}`,
        });
      }

      return updatedOrderRequest;
    } catch (error) {
      logger.error({
        message: `Error while updateOrderRequest in OrderRequestRepository.updateOrderRequest`,
        error,
      });
      throw error;
    }
  }

  async updateLeastItemStatus(
    orderRequestId: StringObjectID,
    leastItemStatus: OrderRequestItemEntity.OrderRequestItemStatusEnum,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<void> {
    const updateQuery: UpdateQuery<OrderRequestEntity.OrderRequestSchema> = {
      $set: { leastItemStatus },
    };
    if (
      ![
        OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
        OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
      ].includes(leastItemStatus)
    ) {
      updateQuery.$unset = { availableAtSiteIds: 1 };
    }
    await this.updateMany({
      filterQuery: { _id: orderRequestId },
      updateQuery,
      options: { session, timestamps: false },
      acl: {
        byPass: true,
        userContext,
      },
    });
  }

  async updateScheduleId(
    orderRequestId: StringObjectID,
    scheduleId: StringObjectID,
    userContext: UserContext,
    session?: ClientSession,
  ): Promise<void> {
    await this.updateMany({
      filterQuery: { _id: orderRequestId },
      updateQuery: { $set: { scheduleId } },
      options: { session, timestamps: false },
      acl: {
        permission: { orderRequest: OrderRequestEntity.OrderRequestActionsEnum.EDIT },
        userContext,
      },
    });
  }
}

export const OrderRequestRepository = new OrderRequestRepositoryClass();
