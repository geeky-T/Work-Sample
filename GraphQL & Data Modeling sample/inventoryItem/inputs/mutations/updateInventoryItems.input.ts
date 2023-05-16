import { Field, InputType } from 'type-graphql';
import { UpdateInventoryItemInput } from './updateInventoryItem.input';

@InputType()
export class UpdateInventoryItemsInput {
  @Field(() => [UpdateInventoryItemInput])
  updateInventories: UpdateInventoryItemInput[];
}
