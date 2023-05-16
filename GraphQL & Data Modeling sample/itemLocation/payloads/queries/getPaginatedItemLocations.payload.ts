import { Field, ObjectType } from 'type-graphql';
import { Entity } from '../../..';
import { PaginatedPayload } from '../../../../utils/pagination/types';
import { ItemLocationSchema } from '../../schemas';

export type GetPaginatedItemLocationsPayload = Entity.GetPaginatedEntitiesPayload<ItemLocationSchema>;

@ObjectType('ItemLocationEdge', { description: 'Edge', simpleResolvers: true })
export class ItemLocationEdge {
  @Field(() => ItemLocationSchema)
  node: ItemLocationSchema;
}

@ObjectType('ItemLocationConnection', {
  description: 'This returns paginated item locations',
  simpleResolvers: true,
})
export class PaginatedItemLocationsPayload extends PaginatedPayload {
  @Field(() => [ItemLocationEdge])
  edges: ItemLocationEdge[];
}
