import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';
import { CreateMediaInput } from '../../../media';
import { ExternalProductCodeInput } from './helpers/externalProductCode.input';

@InputType()
export class CreateItemInput {
  @Field(() => String)
  categoryId: StringObjectID;

  @Field(() => String, { nullable: true })
  brand?: string;

  @Field(() => [ExternalProductCodeInput], { defaultValue: [] })
  externalProductCodes?: ExternalProductCodeInput[];

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  title: string;

  @Field(() => Number, { nullable: true })
  unitCost?: number;

  @Field(() => Number, { nullable: true })
  costOverride?: number;

  @Field(() => [CreateMediaInput], { description: 'Storing media of items.', nullable: true, defaultValue: [] })
  attachments?: CreateMediaInput[];

  @Field(() => String, { nullable: true })
  vendorId?: StringObjectID;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  pickableThroughOrderRequest: boolean;

  entityIdInSourceTenant?: StringObjectID;
}
