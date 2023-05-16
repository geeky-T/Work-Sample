import { registerEnumType } from 'type-graphql';

export enum AssetItemReminderStatusEnum {
  DELETED = 'deleted',
  ACTIVE = 'active',
}

registerEnumType(AssetItemReminderStatusEnum, { name: 'AssetItemReminderStatusEnum' });
