import { StringObjectID } from '../../../../interfaces';

export class TotalQuantityOfItemPayload {
  itemId: StringObjectID;
  totalQuantity: number;
}

export class GetTotalQuantityOfItemsPayload {
  totalQuantityOfItems: TotalQuantityOfItemPayload[];
}
