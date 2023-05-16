import { Field, ObjectType } from 'type-graphql';
import { MutationResponse } from '../../../Entity';
import { AssetItemSchema } from '../../schemas';

@ObjectType({ simpleResolvers: true })
export class UpdateAssetItemPayload extends MutationResponse {
  @Field(() => AssetItemSchema, { nullable: true })
  assetItem?: AssetItemSchema;
}
