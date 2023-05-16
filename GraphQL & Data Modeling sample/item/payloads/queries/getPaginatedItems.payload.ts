import { Field, ObjectType } from 'type-graphql';
import { Entity } from '../../..';
import { PaginatedPayload } from '../../../../utils/pagination/types';
import { ItemUnionGQLType, ItemUnionType } from '../../unions';

export type GetPaginatedItemsPayload = Entity.GetPaginatedEntitiesPayload<ItemUnionType>;

@ObjectType('ItemEdge', { description: 'Edge', simpleResolvers: true })
export class ItemEdge {
  @Field(() => ItemUnionGQLType)
  node: ItemUnionType;
}

@ObjectType('ItemConnection', {
  description: 'This returns paginated items',
  simpleResolvers: true,
})
export class PaginatedItemsPayload extends PaginatedPayload {
  @Field(() => [ItemEdge])
  edges: ItemEdge[];
}
