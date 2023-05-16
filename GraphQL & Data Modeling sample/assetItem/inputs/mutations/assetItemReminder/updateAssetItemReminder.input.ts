import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../../interfaces';

@InputType()
export class UpdateAssetItemReminderInput {
  @Field(() => String)
  reminderId: StringObjectID;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String, { nullable: true })
  meta?: string;

  @Field(() => [String], { nullable: true })
  notifyUserIds?: Array<StringObjectID>;

  @Field(() => String, { nullable: true })
  deletedAt?: Date | string;

  @Field(() => String, { nullable: true })
  deletedById?: StringObjectID;
}
