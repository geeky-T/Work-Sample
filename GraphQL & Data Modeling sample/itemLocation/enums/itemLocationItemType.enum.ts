import { registerEnumType } from 'type-graphql';

export enum ItemLocationItemTypeEnum {
  ASSET = 'asset',
  INVENTORY = 'inventory',
}

registerEnumType(ItemLocationItemTypeEnum, { name: 'ItemLocationItemTypeEnum' });
