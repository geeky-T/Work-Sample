import { registerEnumType } from 'type-graphql';

export enum ItemExternalProductCodeTypeEnum {
  ASIN = 'ASIN',
  UPC = 'UPC',
  EAN = 'EAN',
  ISBN13 = 'ISBN13',
  ISBN10 = 'ISBN10',
  GTIN = 'GTIN',
}

registerEnumType(ItemExternalProductCodeTypeEnum, { name: 'ItemExternalProductCodeTypeEnum' });
