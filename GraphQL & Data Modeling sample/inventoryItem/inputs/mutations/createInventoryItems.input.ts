import { Field, InputType } from 'type-graphql';
import { CreateInventoryItemInput } from './createInventoryItem.input';

@InputType()
export class CreateInventoryItemsInput {
  @Field(() => [CreateInventoryItemInput])
  createInventoryItemInputs: CreateInventoryItemInput[];
}
