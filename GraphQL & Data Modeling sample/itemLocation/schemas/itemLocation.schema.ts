import { Index, modelOptions, prop as Property } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import { Field, Int, ObjectType } from 'type-graphql';
import { StringObjectID } from '../../../interfaces';
import { EntityBaseSchema } from '../../Entity';
import { ItemStatusEnum } from '../../item/enums';
import { LocationTypeEnum } from '../../location';
import { ItemLocationItemTypeEnum } from '../enums';

@ObjectType({ description: 'Item locked quantity data' })
export class LockedQuantitiesSchema {
  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  reservedQuantity: number;

  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  checkoutQuantity: number;

  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  inTransitQuantity: number;
}

@ObjectType({ description: 'ItemLocation Schema' })
@Index({ itemId: 1, locationId: 1 }, { name: 'Unique itemId_locationId across tenant', unique: true })
@Index({ tenantId: 1, siteId: 1 }, { name: 'SiteId filters' })
@Index({ tenantId: 1, itemId: 1, locationId: 1 }, { name: 'ItemId_LocationId filters' })
@Index({ tenantId: 1, locationId: 1 }, { name: 'LocationId filters' })
@Index({ tenantId: 1, itemId: 1 }, { name: 'ItemId filters' })
@modelOptions({ schemaOptions: { collection: 'itemLocations', timestamps: true, versionKey: '__v' } })
export class ItemLocationSchema extends EntityBaseSchema {
  @Field(() => String)
  @Property({ type: Types.ObjectId, required: [true, 'Item id is required'] })
  itemId: StringObjectID;

  @Field(() => ItemLocationItemTypeEnum)
  @Property({ type: String, enum: ItemLocationItemTypeEnum, required: [true, 'Item type is required'] })
  itemType: ItemLocationItemTypeEnum;

  @Field(() => ItemStatusEnum)
  @Property({ type: String, enum: ItemStatusEnum, required: [true, 'Item status is required'] })
  itemStatus: ItemStatusEnum;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: [true, 'Location id is required'] })
  locationId: StringObjectID;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: [true, 'Site id is required'] })
  siteId: StringObjectID;

  @Field(() => LocationTypeEnum)
  @Property({ type: String, enum: LocationTypeEnum, required: [true, 'Location type is required'] })
  locationType: LocationTypeEnum;

  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  totalQuantity: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  totalQuantityFromLocations?: number;

  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  availableQuantity: number;

  @Field(() => Int, { defaultValue: 0 })
  @Property({ type: Number, default: 0 })
  minimumQuantity: number;

  @Field(() => Int, { nullable: true })
  @Property({ type: Number })
  maximumQuantity?: number;

  @Field(() => Boolean, { defaultValue: false })
  @Property({ type: Boolean, default: false })
  minimumQuantityThresholdBreached: boolean;

  @Field(() => LockedQuantitiesSchema)
  @Property({ type: LockedQuantitiesSchema, _id: false })
  lockedQuantities: LockedQuantitiesSchema;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  createdById: StringObjectID;

  sqlId?: number;

  @Field(() => String, { nullable: true })
  @Property({ type: Date })
  outOfStockAt?: Date | string;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  updatedById: StringObjectID;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  tenantId: StringObjectID;
}
