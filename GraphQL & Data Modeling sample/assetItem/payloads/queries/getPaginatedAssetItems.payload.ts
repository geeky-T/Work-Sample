import { Field, ObjectType } from 'type-graphql';
import { Entity } from '../../..';
import { PaginatedPayload } from '../../../../utils';
import { AssetItemSchema } from '../../schemas';

export type GetPaginatedAssetItemsPayload = Entity.GetPaginatedEntitiesPayload<AssetItemSchema>;

@ObjectType('AssetItemEdge', { description: 'Edge', simpleResolvers: true })
export class AssetItemEdge {
  @Field(() => AssetItemSchema)
  node: AssetItemSchema;
}

@ObjectType('AssetItemConnection', {
  description: 'This returns paginated assetItems',
  simpleResolvers: true,
})
export class PaginatedAssetItemsPayload extends PaginatedPayload {
  @Field(() => [AssetItemEdge])
  edges: AssetItemEdge[];
}
