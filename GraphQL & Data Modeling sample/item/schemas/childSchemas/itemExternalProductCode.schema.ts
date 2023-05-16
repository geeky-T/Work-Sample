import { Prop as Property } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { ItemExternalProductCodeTypeEnum } from '../../enums/itemExternalProductType.enum';

@ObjectType({ description: 'Item External Product Code Schema (UPC, ASIN etc.)' })
export class ItemExternalProductCodeSchema {
  @Field(() => ItemExternalProductCodeTypeEnum)
  @Property({
    type: String,
    enum: ItemExternalProductCodeTypeEnum,
    default: ItemExternalProductCodeTypeEnum.UPC,
    required: true,
  })
  type: ItemExternalProductCodeTypeEnum;

  @Field(() => String)
  @Property({ type: String, maxlength: 14, minlength: 10, required: true })
  code: string;
}
