import { InternalServerError, logger } from '@procurenetworks/backend-utils';
import { createUnionType } from 'type-graphql';
import { AssetItemEntity, InventoryItemEntity } from '../..';
import { ItemTypeEnum } from '../enums';

export const ItemUnionGQLType = createUnionType({
  name: 'ItemUnion',
  description: 'It will resolve different Item types',
  types: () => [AssetItemEntity.AssetItemSchema, InventoryItemEntity.InventoryItemSchema] as const,
  resolveType: (value) => {
    switch (value.type) {
      case ItemTypeEnum.ASSET:
        return AssetItemEntity.AssetItemSchema;
      case ItemTypeEnum.INVENTORY:
        return InventoryItemEntity.InventoryItemSchema;
      default: {
        logger.error({ message: `Cannot parse this type`, payload: { value } });
        throw new InternalServerError({
          debugMessage: `Unsupported value found in item's type field ${value.type}`,
          error: new Error(`Unsupported value found in item's type field ${value.type}`),
          message: `ItemUnion.resolveType - Cannot parse this type`,
          params: value,
          report: true,
          where: `ItemUnion.resolveType`,
        });
      }
    }
  },
});

export type ItemUnionType = typeof ItemUnionGQLType;
