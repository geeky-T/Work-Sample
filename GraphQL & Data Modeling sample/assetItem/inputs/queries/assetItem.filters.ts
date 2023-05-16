/* eslint-disable no-use-before-define */
import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';
import { ItemFilters } from '../../../item';
import { AssetItemSchema } from '../../schemas';
@InputType({ description: 'Asset item filters' })
export class AssetItemFilters extends ItemFilters {
  @Field(() => String, { nullable: true })
  reminderJobId?: StringObjectID;

  @Field(() => String, { nullable: true })
  reminderId?: StringObjectID;

  @Field(() => [AssetItemFilters], { nullable: true })
  _or?: AssetItemFilters[];

  @Field(() => [AssetItemFilters], { nullable: true })
  _and?: AssetItemFilters[];

  _exists?: Partial<Record<keyof AssetItemSchema, boolean>>;
}
