import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../../interfaces';

@InputType()
export class UndeleteAssetItemReminderInput {
  @Field(() => String)
  reminderId: StringObjectID;
}
