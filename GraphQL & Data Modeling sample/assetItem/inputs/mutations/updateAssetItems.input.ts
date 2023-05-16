import { Field, InputType } from 'type-graphql';
import { UpdateAssetItemInput } from './updateAssetItem.input';

@InputType()
export class UpdateAssetItemsInput {
  @Field(() => [UpdateAssetItemInput])
  updateAssets: UpdateAssetItemInput[];
}
