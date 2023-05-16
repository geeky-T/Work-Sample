import { Field, InputType } from 'type-graphql';
import { ItemExternalProductCodeTypeEnum } from '../../../enums';

@InputType({ description: 'Item External Product Code Schema (UPC, ASIN etc.)' })
export class ExternalProductCodeInput {
  @Field(() => ItemExternalProductCodeTypeEnum)
  type: ItemExternalProductCodeTypeEnum;

  @Field(() => String)
  code: string;
}
