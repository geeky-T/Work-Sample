import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';
import { CreateMediaInput } from '../../../media';
import { ExternalProductCodeInput } from './helpers/externalProductCode.input';

@InputType()
export class UpdateItemInput {
  @Field(() => String)
  itemId: StringObjectID;

  @Field(() => String, { nullable: true })
  categoryId?: StringObjectID;

  @Field(() => String, { nullable: true })
  brand?: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => Number, { nullable: true })
  unitCost?: number;

  @Field(() => Number, { nullable: true })
  costOverride?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [ExternalProductCodeInput])
  externalProductCodes: ExternalProductCodeInput[];

  @Field(() => [CreateMediaInput], { description: 'Storing media of items.' })
  attachments: CreateMediaInput[];

  @Field(() => String, { nullable: true })
  vendorId?: StringObjectID;

  @Field(() => Boolean, { nullable: true })
  pickableThroughOrderRequest?: boolean;
}
