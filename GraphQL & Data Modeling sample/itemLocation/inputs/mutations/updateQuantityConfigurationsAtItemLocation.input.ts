import { Field, InputType, Int } from 'type-graphql';
import { StringObjectID } from '../../../../interfaces';

@InputType({ isAbstract: true })
export class UpdateQuantityConfigurationsAtItemLocationInput {
  @Field(() => String)
  itemId: StringObjectID;
  @Field(() => String)
  locationId: StringObjectID;
  @Field(() => Int, { defaultValue: 0 })
  minimumQuantity: number;
  @Field(() => Int, { nullable: true })
  maximumQuantity?: number;
}

export class UpdateQuantityConfigurationsAtItemLocationsInput {
  quantityConfigurationsAtItemLocations: Array<UpdateQuantityConfigurationsAtItemLocationInput>;
}
