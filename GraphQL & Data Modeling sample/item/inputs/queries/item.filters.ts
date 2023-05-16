/* eslint-disable no-use-before-define */
import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../..';
import { EntitySourceEnum } from '../../../Entity/enums/entitySource.enum';
import { ItemStatusEnum, ItemTypeEnum } from '../../enums';
import { ItemUnionType } from '../../unions';

@InputType({ description: 'Item filters' })
export class ItemFilters {
  @Field(() => [ItemFilters], { nullable: true })
  _or?: ItemFilters[];

  @Field(() => [ItemFilters], { nullable: true })
  _and?: ItemFilters[];

  _exists?: Partial<Record<keyof ItemUnionType, boolean>>;

  @Field(() => [ItemTypeEnum], { nullable: true })
  types?: ItemTypeEnum[];

  @Field(() => [ItemStatusEnum], { nullable: true })
  statuses?: ItemStatusEnum[];

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [String], { nullable: true })
  skus?: string[];

  @Field(() => [String], { nullable: true })
  productCodes?: string[];

  @Field(() => [String], { nullable: true })
  categoryIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  tenantIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  entityIdsInSourceTenant?: StringObjectID[];

  @Field(() => [EntitySourceEnum], { nullable: true })
  entitySources?: EntitySourceEnum[];

  @Field(() => [String], { nullable: true })
  siteIds?: StringObjectID[];

  @Field(() => [String], { nullable: true })
  vendorIds?: StringObjectID[];

  @Field(() => Boolean, { nullable: true })
  pickableThroughOrderRequest?: boolean;

  @Field(() => [String], { nullable: true })
  itemIds?: StringObjectID[];
}
