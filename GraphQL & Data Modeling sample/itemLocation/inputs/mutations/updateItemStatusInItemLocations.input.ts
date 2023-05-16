import { StringObjectID } from '../../../../interfaces';
import { ItemStatusEnum } from '../../../item/enums';

export class UpdateItemStatusInItemLocationsInput {
  itemIds: StringObjectID[];
  itemStatus: ItemStatusEnum;
}
