import { ItemSchema } from '../../schemas';

export type GetItemsByIdsAcrossTenantsPayload = {
  items: Array<ItemSchema>;
};
