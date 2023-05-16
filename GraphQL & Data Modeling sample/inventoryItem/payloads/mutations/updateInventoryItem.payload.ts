import { Field, ObjectType } from 'type-graphql';
import { MutationResponse } from '../../../Entity';
import { InventoryItemSchema } from '../../schemas';

@ObjectType({ simpleResolvers: true })
export class UpdateInventoryItemPayload extends MutationResponse {
  @Field(() => InventoryItemSchema, { nullable: true })
  inventoryItem?: InventoryItemSchema;
}
