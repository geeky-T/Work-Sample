import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';

@InputType()
export class GetTotalQuantityOfItemsInput {
  itemIds: StringObjectID[];

  @Field(() => String, { nullable: true })
  siteId?: StringObjectID;
}
