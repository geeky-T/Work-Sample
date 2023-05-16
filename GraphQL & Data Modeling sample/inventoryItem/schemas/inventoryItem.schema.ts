import { prop as Property } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { ItemSchema, ItemTypeEnum } from '../../item';

@ObjectType({ simpleResolvers: true })
export class InventoryItemSchema extends ItemSchema {
  type = ItemTypeEnum.INVENTORY;

  @Field(() => String, { nullable: true, deprecationReason: 'Use model instead of mName.' })
  @Property({ type: String })
  mName?: string;
}
