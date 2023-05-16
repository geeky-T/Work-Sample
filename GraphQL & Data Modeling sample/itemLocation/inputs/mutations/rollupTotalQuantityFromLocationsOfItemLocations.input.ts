import { Field, InputType } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';

@InputType()
export class RollupTotalQuantityFromLocationsOfItemLocationInput {
  @Field(() => String)
  itemId: StringObjectID;

  @Field(() => String)
  siteId: StringObjectID;
}

export class RollupTotalQuantityFromLocationsOfItemLocationsInput {
  inputs: RollupTotalQuantityFromLocationsOfItemLocationInput[];
}
