import { Field, InputType } from 'type-graphql';
import { UpdateItemInput } from '../../../item';
import { CreateMediaInput } from '../../../media';

@InputType()
export class UpdateAssetItemInput extends UpdateItemInput {
  @Field(() => String, { nullable: true })
  mName?: string;

  @Field(() => String, { nullable: true })
  modelNumber?: string;

  @Field(() => String, { nullable: true })
  purchaseDate?: Date | string;

  @Field(() => String, { nullable: true })
  serialNumber?: string;

  @Field(() => String, { nullable: true })
  warrantyExpiryDate?: Date | string;

  @Field(() => [CreateMediaInput], { description: 'Storing media of items.' })
  protectedAttachments: CreateMediaInput[];
}
