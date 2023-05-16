import { registerEnumType } from 'type-graphql';

export enum ItemTypeEnum {
  ASSET = 'asset',
  ASSET_KIT = 'assetKit',
  INVENTORY = 'inventory',
  INVENTORY_KIT = 'inventoryKit',
}

registerEnumType(ItemTypeEnum, { name: 'ItemTypeEnum' });
