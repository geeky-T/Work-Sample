// import { CreatePickListRepositoryInput } from '@custom-types/pickList';
import { CreatePickListsRepositoryInput } from '@custom-types/PickList';
import { MongooseBaseRepository } from '@procurenetworks/backend-utils';
import { convertSortPropsToMongoQuery, Entity, PickListEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import mongoose, { ClientSession, FilterQuery } from 'mongoose';
import { buildGetPickListsFilterQuery } from './utils/buildFilterQuery';

class PickListRepositoryClass extends MongooseBaseRepository<typeof PickListEntity.PickListSchema> {
  constructor() {
    super({
      entityClass: PickListEntity.PickListSchema,
      mongooseConnection: mongoose.connection,
      schemaOptions: { collection: 'pickLists' },
    });
  }

  /* Queries */
  async getAllPickLists(
    { disableBaseFilter = false, filters, projection, sorts }: PickListEntity.GetAllPickListsInput,
    userContext: UserContext,
  ): Promise<Array<PickListEntity.PickListSchema>> {
    let baseFilterQuery: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetPickListsFilterQuery(filters);
    const pickLists = await this.mongooseModel
      .find({ ...filterQuery, ...baseFilterQuery }, projection && { projection })
      .sort(convertSortPropsToMongoQuery(sorts || [{ sortField: '_id', sortOrder: Entity.SortOrderEnum.DESC }]))
      .lean();
    return pickLists;
  }

  async getDistinctValuesForAllPickLists<T extends keyof PickListEntity.PickListSchema>(
    { disableBaseFilter = false, filters }: PickListEntity.GetAllPickListsInput,
    field: T,
    userContext: UserContext,
  ): Promise<PickListEntity.PickListSchema[T][]> {
    let baseFilterQuery: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetPickListsFilterQuery(filters);
    const distinctValues = await this.mongooseModel.distinct(field, {
      ...filterQuery,
      ...baseFilterQuery,
    });
    return distinctValues as PickListEntity.PickListSchema[T][];
  }

  async getPickListsCount(
    { disableBaseFilter = false, filters }: PickListEntity.GetAllPickListsInput,
    userContext: UserContext,
  ): Promise<number> {
    let baseFilterQuery: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetPickListsFilterQuery(filters);
    return this.mongooseModel.countDocuments({ ...filterQuery, ...baseFilterQuery });
  }

  async getPickList(
    { disableBaseFilter = false, filters }: PickListEntity.GetPickListInput,
    userContext: UserContext,
  ): Promise<PickListEntity.PickListSchema> {
    let baseFilterQuery: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetPickListsFilterQuery(filters);
    return this.mongooseModel.findOne({ ...filterQuery, ...baseFilterQuery }).lean();
  }

  async getPaginatedPickLists(
    { disableBaseFilter = false, filters, paginationProps, projection }: PickListEntity.GetPaginatedPickListsInput,
    userContext: UserContext,
  ): Promise<Array<PickListEntity.PickListSchema>> {
    let baseFilterQuery: FilterQuery<DocumentType<PickListEntity.PickListSchema>> = {
      tenantId: userContext.tenantId,
    };
    if (disableBaseFilter) {
      baseFilterQuery = {};
    }
    const filterQuery = buildGetPickListsFilterQuery(filters);
    const { limit = 10, skip = 0 } = paginationProps;
    const pickLists = await this.mongooseModel
      .find({ ...filterQuery, ...baseFilterQuery }, projection && { projection })
      .limit(limit)
      .skip(skip)
      .lean();
    return pickLists;
  }

  /* Mutations */
  async createPickList(
    pickList: CreatePickListsRepositoryInput,
    session?: ClientSession,
  ): Promise<PickListEntity.PickListSchema> {
    const [createdPickList] = await this.mongooseModel.insertMany([pickList], {
      session,
    });

    return createdPickList;
  }
}

export const PickListRepository = new PickListRepositoryClass();
