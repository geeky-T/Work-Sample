import { prop as Property } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import { Field, ObjectType } from 'type-graphql';
import { StringObjectID } from '../../../interfaces';
import { ItemTypeEnum } from '../../item/enums';
import { ItemSchema } from '../../item/schemas';
import { MediaSchema } from '../../media';
import { AssetItemReminderStatusEnum, AssetItemReminderTypeEnum } from '../enums';

@ObjectType({ simpleResolvers: true })
export class AssetItemReminder {
  _id: StringObjectID;

  @Field(() => AssetItemReminderTypeEnum, { defaultValue: AssetItemReminderTypeEnum.REMINDER })
  @Property({
    type: String,
    enum: AssetItemReminderTypeEnum,
    required: true,
    default: AssetItemReminderTypeEnum.REMINDER,
  })
  type: AssetItemReminderTypeEnum;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  cron?: string;

  @Field(() => Boolean, { defaultValue: false })
  @Property({ type: Boolean, default: false })
  recurring: boolean;

  @Field(() => AssetItemReminderStatusEnum)
  @Property({ type: String, enum: AssetItemReminderStatusEnum })
  status: AssetItemReminderStatusEnum;

  @Field(() => String)
  @Property({ type: String })
  note: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  meta?: string;

  @Field(() => String)
  @Property({ type: String })
  startReminderAt: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  lastReminderAt?: string;

  @Field(() => [String])
  @Property({ type: Types.ObjectId, default: [] })
  notifyUserIds: Array<StringObjectID>;

  @Field(() => String)
  @Property({ type: Types.ObjectId })
  jobId: StringObjectID;

  @Field(() => String)
  @Property({ type: String })
  createdAt: Date | string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  updatedAt?: Date | string;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  createdById: StringObjectID;

  @Field(() => String)
  @Property({ type: Types.ObjectId, required: true })
  updatedById: StringObjectID;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  deletedAt?: Date | string;

  @Field(() => String, { nullable: true })
  @Property({ type: Types.ObjectId })
  deletedById?: StringObjectID;
}

@ObjectType({ simpleResolvers: true })
export class AssetItemSchema extends ItemSchema {
  type = ItemTypeEnum.ASSET;

  @Field(() => String)
  @Property({ type: String, required: [true, 'Model is required'] })
  mName: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  modelNumber?: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  serialNumber?: string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  purchaseDate?: Date | string;

  @Field(() => String, { nullable: true })
  @Property({ type: String })
  warrantyExpiryDate?: Date | string;

  @Field(() => String, { nullable: true })
  @Property({ type: Types.ObjectId })
  warrantyExpiryScheduledJobId?: StringObjectID;

  @Field(() => [MediaSchema], { description: 'Storing media of items', defaultValue: [] })
  @Property({ type: [MediaSchema], default: [] })
  protectedAttachments: MediaSchema[];

  @Field(() => [AssetItemReminder], { nullable: true, defaultValue: [] })
  @Property({ type: AssetItemReminder, default: [] })
  reminders: Array<AssetItemReminder>;
}
