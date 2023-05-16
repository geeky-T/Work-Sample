import { Field, ObjectType } from 'type-graphql';
import { Entity } from '../../..';
import { PaginatedPayload } from '../../../../utils';
import { InventoryItemSchema } from '../../schemas';

export type GetPaginatedInventoryItemsPayload = Entity.GetPaginatedEntitiesPayload<InventoryItemSchema>;

@ObjectType('InventoryItemEdge', { description: 'Edge', simpleResolvers: true })
export class InventoryItemEdge {
  @Field(() => InventoryItemSchema)
  node: InventoryItemSchema;
}

@ObjectType('InventoryItemConnection', {
  description: 'This returns paginated inventoryItems',
  simpleResolvers: true,
})
export class PaginatedInventoryItemsPayload extends PaginatedPayload {
  @Field(() => [InventoryItemEdge])
  edges: InventoryItemEdge[];
}
