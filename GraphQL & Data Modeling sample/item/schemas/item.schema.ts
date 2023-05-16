import { Index, modelOptions, prop as Property } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import { Field, ObjectType } from 'type-graphql';
import { StringObjectID } from '../../../interfaces';
import { EntityBaseSchema } from '../../Entity';
import { EntitySourceEnum } from '../../Entity/enums/entitySource.enum';
import { MediaSchema } from '../../media';
import { ItemStatusEnum, ItemTypeEnum } from '../enums';
import { ItemExternalProductCodeSchema } from './childSchemas';

@ObjectType({ description: 'Item schema' })
@Index({ tenantId: 1, categoryId: 1 }, { name: 'tenantId_categoryId' })
@Index({ tenantId: 1, type: 1, categoryId: 1 }, { name: 'tenantId_type_categoryId' })
@Index({ tenantId: 1, vendorId: 1 }, { name: 'tenantId_vendorId' })
@Index({ tenantId: 1, type: 1, sku: 1 }, { name: 'tenantId_type_sku', unique: true })
@Index(
  {
    tenantId: 1,
    sku: 'text',
    title: 'text',
    brand: 'text',
    description: 'text',
    modelNumber: 'text',
    mName: 'text',
    serialNumber: 'text',
  },
  { name: 'tenantId_text_search', sparse: true }
)
@modelOptions({ schemaOptions: { collection: 'items', timestamps: true } })
export class ItemSchema extends EntityBaseSchema {
  @Field(() => String)
  @Property({ type: String, required: [true, 'SKU is required'] })
  sku: string;

  @Field(() => ItemTypeEnum)
  @Property({
    type: String,
    enum: ItemTypeEnum,
    required: true,
  })
  type!: ItemTypeEnum;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: [true, 'Category is required'] })
  categoryId: StringObjectID;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  brand?: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  description?: string;

  @Field(() => ItemStatusEnum)
  @Property({ type: String, enum: ItemStatusEnum, default: ItemStatusEnum.ACTIVE })
  status: ItemStatusEnum;

  @Field(() => String)
  @Property({ type: String, required: true })
  title: string;

  /** TODO: Add validators and identifiers to identify what kind of code is it. */
  @Field(() => [ItemExternalProductCodeSchema], { defaultValue: [] })
  @Property({ type: [ItemExternalProductCodeSchema], default: [] })
  externalProductCodes: ItemExternalProductCodeSchema[];

  @Field(() => String, { nullable: true })
  @Property({ type: Types.ObjectId })
  vendorId?: StringObjectID;

  @Field(() => String, { nullable: true })
  @Property({ type: Types.ObjectId })
  entityIdInSourceTenant?: StringObjectID;

  @Field(() => EntitySourceEnum)
  @Property({ type: String, enum: EntitySourceEnum, required: true, default: EntitySourceEnum.INTERNAL })
  entitySource: EntitySourceEnum;

  @Field(() => Number, { nullable: true })
  @Property({ type: Number, default: 0 })
  unitCost?: number;

  @Field(() => Number, { nullable: true })
  @Property({ type: Number })
  costOverride?: number;

  @Field(() => Boolean, { defaultValue: true })
  @Property({ type: Boolean, default: true })
  pickableThroughOrderRequest: boolean;

  @Field(() => [MediaSchema], { description: 'Storing media of items', defaultValue: [] })
  @Property({ type: [MediaSchema], default: [] })
  attachments: MediaSchema[];

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  createdById: StringObjectID;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  deletedAt?: Date | string;

  @Field(() => String, { nullable: true })
  @Property({ type: Types.ObjectId })
  deletedById?: StringObjectID;

  sqlId?: number;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  updatedById: StringObjectID;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  tenantId: StringObjectID;
}
