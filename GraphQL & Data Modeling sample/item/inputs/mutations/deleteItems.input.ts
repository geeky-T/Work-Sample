import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../..';

@InputType({})
export class DeleteItemsInput {
  @Field(() => [String])
  itemIds: StringObjectID[];
}
