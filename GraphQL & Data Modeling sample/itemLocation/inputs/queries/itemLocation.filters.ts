/* eslint-disable no-use-before-define */
import { Field, InputType } from 'type-graphql';
import { ItemLocationItemTypeEnum, ItemLocationSchema } from '../..';
import { StringObjectID } from '../../../..';
import { DateFilter } from '../../../Entity';
import { ItemStatusEnum } from '../../../item/enums';
import { LocationTypeEnum } from '../../../location';

@InputType({ description: 'ItemLocation filters' })
export class ItemLocationFilters {
  @Field(() => [ItemLocationFilters], { nullable: true })
  _or?: ItemLocationFilters[];

  @Field(() => [ItemLocationFilters], { nullable: true })
  _and?: ItemLocationFilters[];

  _exists?: Partial<Record<keyof ItemLocationSchema, boolean>>;

  @Field(() => [String], { nullable: true })
  itemLocationIds?: StringObjectID[];

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [String], { nullable: true })
  itemIds?: StringObjectID[];

  @Field(() => [ItemLocationItemTypeEnum], { nullable: true })
  itemTypes?: ItemLocationItemTypeEnum[];

  @Field(() => [ItemStatusEnum], { nullable: true })
  itemStatuses?: ItemStatusEnum[];

  @Field(() => [String], { nullable: true })
  categoryIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  vendorIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  siteIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  locationIds?: StringObjectID[];

  @Field(() => [LocationTypeEnum], { nullable: true })
  locationTypes?: LocationTypeEnum[];

  @Field(() => Boolean, { nullable: true })
  recentOnly?: boolean;

  @Field(() => Boolean, { nullable: true })
  nonZeroTotalQuantity?: boolean;

  @Field(() => Boolean, { nullable: true })
  nonZeroTotalQuantityFromLocations?: boolean;

  @Field(() => Boolean, { nullable: true })
  onlyMinimumQuantityThresholdBreached?: boolean;

  @Field(() => DateFilter, { nullable: true })
  updatedAt?: DateFilter;
}
