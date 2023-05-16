import { registerEnumType } from 'type-graphql';

export enum ItemStatusEnum {
  DELETED = 'deleted',
  ACTIVE = 'active',
}

registerEnumType(ItemStatusEnum, { name: 'ItemStatusEnum' });
