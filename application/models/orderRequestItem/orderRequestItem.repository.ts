import {
  CreateOrderRequestItemRepositoryInput,
  UpdateOrderRequestItemRepositoryInput,
  UpdateOrderRequestItemStatusRepositoryInput,
} from '@custom-types/OrderRequestItem';
import { MongooseBaseRepository, logger } from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestItemEntity,
  StringObjectID,
  UserContext,
  convertSortPropsToMongoQuery,
} from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import mongoose, { ClientSession, FilterQuery } from 'mongoose';
import { buildGetOrderRequestItemsFilterQuery } from './utils/buildFilterQuery';
import { buildUpdateOrderRequestItemQuery } from './utils/buildUpdateQuery';

class OrderRequestItemRepositoryClass extends MongooseBaseRepository<typeof OrderRequestItemEntity.OrderRequestItemSchema> {
  constructor() {
    super({
      entityClass: OrderRequestItemEntity.OrderRequestItemSchema,
      mongooseConnection: mongoose.connection,
      schemaOptions: { collection: 'orderRequestItems' },
    });
  }

  /* Queries */
  async getAllOrderRequestItems(
    { disableBaseFilter = false, filters, projection, sorts }: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    userContext?: UserContext,
    session?: ClientSession,
  ): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> = {
      deletedAt: { $exists: false },
    };
    if (userContext) {
      baseFilterQuery.tenantId = userContext.tenantId;
    }
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetOrderRequestItemsFilterQuery(filters);
    const orderRequestItemsRequest = this.mongooseModel
      .find({ ...filterQuery, ...baseFilterQuery })
      .sort(convertSortPropsToMongoQuery(sorts || [{ sortField: '_id', sortOrder: Entity.SortOrderEnum.DESC }]))
      .select(projection)
      .lean();
    if (session) {
      orderRequestItemsRequest.session(session);
    }
    const orderRequestItems = await orderRequestItemsRequest.exec();
    return orderRequestItems;
  }

  async getOrderRequestItemsAcrossTenants({
    filters,
    projection,
  }: OrderRequestItemEntity.GetAllOrderRequestItemsInput): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    const filterQuery = await buildGetOrderRequestItemsFilterQuery(filters);
    const orderRequestItems = await this.mongooseModel
      .find({ ...filterQuery })
      .select(projection)
      .lean();
    return orderRequestItems;
  }

  async getDistinctValuesForAllOrderRequestItems<T extends keyof OrderRequestItemEntity.OrderRequestItemSchema>(
    { disableBaseFilter = false, filters }: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    field: T,
    userContext: UserContext,
  ): Promise<OrderRequestItemEntity.OrderRequestItemSchema[T][]> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> = {
      deletedAt: { $exists: false },
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetOrderRequestItemsFilterQuery(filters);
    const distinctValues = await this.mongooseModel.distinct(field, {
      ...filterQuery,
      ...baseFilterQuery,
    });
    return distinctValues as OrderRequestItemEntity.OrderRequestItemSchema[T][];
  }

  async getOrderRequestItemsCount(
    { disableBaseFilter = false, filters }: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    userContext: UserContext,
  ): Promise<number> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> = {
      deletedAt: { $exists: false },
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetOrderRequestItemsFilterQuery(filters);
    return this.mongooseModel.countDocuments({ ...filterQuery, ...baseFilterQuery });
  }

  async getAllOrderRequestItemsForRestockUpdates(
    { disableBaseFilter = false, filters, projection, sorts }: OrderRequestItemEntity.GetAllOrderRequestItemsInput,
    userContext?: UserContext,
  ): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    let baseFilterQuery: FilterQuery<DocumentType<OrderRequestItemEntity.OrderRequestItemSchema>> = {
      deletedAt: { $exists: false },
    };
    if (userContext) {
      baseFilterQuery.tenantId = userContext.tenantId;
    }
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetOrderRequestItemsFilterQuery(filters);
    const orderRequestItems = await this.mongooseModel
      .find({ ...filterQuery, ...baseFilterQuery })
      .sort(convertSortPropsToMongoQuery(sorts || [{ sortField: '_id', sortOrder: Entity.SortOrderEnum.DESC }]))
      .select(projection)
      .lean();
    return orderRequestItems;
  }

  /* Mutations */
  async createOrderRequestItems(
    orderRequestItems: CreateOrderRequestItemRepositoryInput[],
    session: ClientSession,
  ): Promise<Array<OrderRequestItemEntity.OrderRequestItemSchema>> {
    const createdOrderRequestItems = await this.mongooseModel.insertMany(orderRequestItems, {
      session,
    });

    return createdOrderRequestItems.map(
      (createdOrderRequestItem) => createdOrderRequestItem.toJSON() as OrderRequestItemEntity.OrderRequestItemSchema,
    );
  }

  async deleteOrderRequestItems(
    orderRequestItemIds: StringObjectID[],
    { currentUserInfo, requestTimestamp }: UserContext,
    session?: ClientSession,
  ) {
    return this.mongooseModel.updateMany(
      { _id: { $in: orderRequestItemIds } },
      {
        $addToSet: {
          statusHistory: {
            createdAt: requestTimestamp,
            createdById: currentUserInfo._id,
            status: OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED,
          },
        },
        $set: { status: OrderRequestItemEntity.OrderRequestItemStatusEnum.CANCELLED },
      },
      {
        session,
      },
    );
  }

  async bulkUpdateOrderRequestItems(
    updatedOrderRequestItems: UpdateOrderRequestItemRepositoryInput[],
    userContext: UserContext,
    session?: ClientSession,
  ) {
    try {
      const updateOrderRequestItemUpdateQueries = [];
      for (const updatedOrderRequestItem of updatedOrderRequestItems) {
        const updateOrderRequestItemUpdateQuery = buildUpdateOrderRequestItemQuery(updatedOrderRequestItem, userContext);

        /** DO NOT ADD tenantId as filter as it will break the updates to external order request items. */
        const updateOrderRequestItemFilterQuery = await buildGetOrderRequestItemsFilterQuery({
          orderRequestItemIds: [updatedOrderRequestItem._id],
        });
        updateOrderRequestItemUpdateQueries.push({
          updateOne: {
            filter: updateOrderRequestItemFilterQuery,
            update: updateOrderRequestItemUpdateQuery,
          },
        });
      }

      if (updateOrderRequestItemUpdateQueries.length !== 0) {
        return this.mongooseModel.bulkWrite(updateOrderRequestItemUpdateQueries, { session });
      }
    } catch (error) {
      logger.error({
        message: `Error while updateOrderRequestItem in OrderRequestItemRepository.updateOrderRequestItem`,
        error,
      });
      throw error;
    }
  }

  async pushTrackingDetailsToCorrespondingOrderRequestItems(
    trackingDetailsByOrderRequestItemId: Record<string, OrderRequestItemEntity.OrderRequestItemTrackingDetailsSchema[]>,
    session?: ClientSession,
  ) {
    const bulkOrderItemsTrackingDetails = Object.keys(trackingDetailsByOrderRequestItemId).map((itemId) => {
      return {
        updateOne: {
          filter: { _id: itemId },
          update: {
            $push: {
              trackingDetails: { $each: trackingDetailsByOrderRequestItemId[itemId] },
            },
          },
        },
      };
    });
    if (bulkOrderItemsTrackingDetails.length !== 0) {
      return this.mongooseModel.bulkWrite(bulkOrderItemsTrackingDetails, { session });
    }
  }

  async pushTransactionDetailsToCorrespondingOrderRequestItems(
    transactionDetailsByOrderRequestItemId: Record<
      string,
      OrderRequestItemEntity.OrderRequestItemTransactionDetailsSchema[]
    >,
    session?: ClientSession,
  ) {
    const bulkOrderItemsTransactionDetails = Object.keys(transactionDetailsByOrderRequestItemId).map((itemId) => {
      return {
        updateOne: {
          filter: { _id: itemId },
          update: {
            $push: {
              transactionDetails: { $each: transactionDetailsByOrderRequestItemId[itemId] },
            },
          },
        },
      };
    });
    if (bulkOrderItemsTransactionDetails.length !== 0) {
      return this.mongooseModel.bulkWrite(bulkOrderItemsTransactionDetails, { session });
    }
  }

  async updateOrderRequestItemStatus(
    updates: UpdateOrderRequestItemStatusRepositoryInput,
    session?: ClientSession,
  ): Promise<OrderRequestItemEntity.OrderRequestItemSchema | null> {
    const { nonRemovableNote, orderRequestItemId, statusHistory, status, updatedById } = updates;
    return this.mongooseModel
      .findOneAndUpdate(
        { _id: orderRequestItemId },
        {
          $push: { nonRemovableNotes: nonRemovableNote, statusHistory },
          $set: { status, updatedById },
        },
        { new: true, session },
      )
      .lean();
  }
}

export const OrderRequestItemRepository = new OrderRequestItemRepositoryClass();
