import { StringObjectID } from '../../../../interfaces';
import { ItemStatusEnum } from '../../../item/enums';
import { LocationTypeEnum } from '../../../location';
import { ItemLocationItemTypeEnum } from '../../enums';

export class CreateBaseItemLocationInput {
  itemId: StringObjectID;
  itemType?: ItemLocationItemTypeEnum;
  itemStatus?: ItemStatusEnum;
  quantity?: number = 0;
  minimumQuantity?: number;
  maximumQuantity?: number;
  siteId?: StringObjectID;
  locationId: StringObjectID;
  locationType?: LocationTypeEnum;
}
