/* eslint-disable no-use-before-define */
import { Field, InputType } from 'type-graphql';
import { ItemFilters } from '../../../item';
import { InventoryItemSchema } from '../../schemas';

@InputType({ description: 'InventoryItem filters' })
export class InventoryItemFilters extends ItemFilters {
  @Field(() => [InventoryItemFilters], { nullable: true })
  _or?: InventoryItemFilters[];

  @Field(() => [InventoryItemFilters], { nullable: true })
  _and?: InventoryItemFilters[];

  _exists?: Partial<Record<keyof InventoryItemSchema, boolean>>;
}
