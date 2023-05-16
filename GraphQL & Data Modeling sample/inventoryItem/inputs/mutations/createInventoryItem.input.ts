import { Field, InputType } from 'type-graphql';
import { CreateItemInput, ItemTypeEnum } from '../../../item';

@InputType()
export class CreateInventoryItemInput extends CreateItemInput {
  @Field(() => ItemTypeEnum, { defaultValue: ItemTypeEnum.INVENTORY })
  type: ItemTypeEnum.INVENTORY;

  @Field(() => String, { nullable: true })
  mName?: string;
}
