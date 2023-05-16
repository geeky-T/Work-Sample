import { registerEnumType } from 'type-graphql';

export enum AssetItemReminderTypeEnum {
  REMINDER = 'reminder',
  MAINTENANCE = 'maintenance',
}

registerEnumType(AssetItemReminderTypeEnum, { name: 'AssetItemReminderTypeEnum' });
