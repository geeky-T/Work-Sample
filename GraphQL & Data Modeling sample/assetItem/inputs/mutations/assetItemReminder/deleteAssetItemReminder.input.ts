import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../../interfaces';

@InputType()
export class DeleteAssetItemReminderInput {
  @Field(() => String)
  reminderId: StringObjectID;
}
