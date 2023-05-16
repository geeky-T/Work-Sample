import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../..';

@InputType({})
export class UndeleteItemsInput {
  @Field(() => [String])
  itemIds: StringObjectID[];
}
