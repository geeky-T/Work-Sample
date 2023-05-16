import { StringObjectID } from '../../../../interfaces';
import { LocationTypeEnum } from '../../../location';
import { ItemLocationItemTypeEnum } from '../../enums';

export class UpdateQuantityAtItemLocationInput {
  itemId: StringObjectID;
  itemType: ItemLocationItemTypeEnum;
  quantity: number;
  siteId: StringObjectID;
  locationId: StringObjectID;
  locationType: LocationTypeEnum;
}
