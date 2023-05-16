import { Field, InputType } from 'type-graphql';
import { UpdateItemInput } from '../../../item';

@InputType()
export class UpdateInventoryItemInput extends UpdateItemInput {
  @Field(() => String, { nullable: true })
  mName?: string;
}
