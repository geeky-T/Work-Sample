import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';
import { CreateItemInput, ItemTypeEnum } from '../../../item';
import { CreateMediaInput } from '../../../media';
import { AssetItemReminderTypeEnum } from '../../enums';

@InputType()
export class AssetItemReminderInput {
  @Field(() => AssetItemReminderTypeEnum, { defaultValue: AssetItemReminderTypeEnum.REMINDER, nullable: true })
  type: AssetItemReminderTypeEnum;

  @Field(() => String, { nullable: true })
  cron?: string;

  @Field(() => Boolean, { defaultValue: false })
  recurring: boolean;

  @Field(() => String)
  note: string;

  @Field(() => String)
  startReminderAt: string;

  @Field(() => String, { nullable: true })
  lastReminderAt?: string;

  @Field(() => [String])
  notifyUserIds: Array<StringObjectID>;
}

@InputType()
export class CreateAssetItemInput extends CreateItemInput {
  @Field(() => ItemTypeEnum, { defaultValue: ItemTypeEnum.ASSET })
  type: ItemTypeEnum.ASSET;

  @Field(() => String)
  mName: string;

  @Field(() => String, { nullable: true })
  modelNumber?: string;

  @Field(() => String, { nullable: true })
  serialNumber?: string;

  @Field(() => String, { nullable: true })
  purchaseDate?: Date | string;

  @Field(() => String, { nullable: true })
  warrantyExpiryDate?: Date | string;

  @Field(() => [CreateMediaInput], { description: 'Storing media of items.', nullable: true, defaultValue: [] })
  protectedAttachments?: CreateMediaInput[];

  @Field(() => [AssetItemReminderInput], { nullable: true, defaultValue: [] })
  reminders?: Array<AssetItemReminderInput>;
}
