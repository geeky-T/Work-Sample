import { Field, InputType } from 'type-graphql';
import { CreateAssetItemInput } from './createAssetItem.input';

@InputType()
export class CreateAssetInputs {
  @Field(() => [CreateAssetItemInput])
  createAssetItemInputs: CreateAssetItemInput[];
}
