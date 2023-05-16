import { Field, InputType } from 'type-graphql';
import { AssetItemReminderInput } from '../createAssetItem.input';

@InputType()
export class CreateAssetItemReminderInput extends AssetItemReminderInput {
  @Field(() => String)
  assetItemId: string;
}
