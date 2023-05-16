import { ItemEntity, StringObjectID } from '@procurenetworks/inter-service-contracts';

/* Version 2 */
export interface Location {
  id: StringObjectID;
  name: string;
  quantity: number;
}

export interface AssetInventoryItemWithLocation {
  active_flag: number;
  brand?: string;
  category_id: StringObjectID;
  category_name: string;
  cost?: string;
  description?: string;
  id: StringObjectID;
  image?: string;
  locations: Location[];
  model?: string;
  product_code?: string;
  shipping_fees?: string;
  sku: string;
  title: string;
  type: string;
}

export type InventoryItem = {
  id: StringObjectID;
  inventory_code: string;
  product_code?: string;
  inventory_type: string;
  title: string;
  brand?: string;
  model?: string;
  description?: string;
  category: string;
  category_id: StringObjectID;
  cost?: string;
  cost_each: string;
  shipping_fees?: string;
  image?: string;
  thumbnail?: string;
  type: number;
  status: ItemEntity.ItemStatusEnum;
};

export type MinimalSiteResponseType = {
  id: StringObjectID;
  name: string;
};

export type MinimalCategoryResponseType = {
  id: StringObjectID;
  name: string;
};

export type MinimalDepartmentResponseType = {
  id: StringObjectID;
  name: string;
  department_code: string;
};

export type MinimalProjectResponseType = {
  id: StringObjectID;
  name: string;
};

export interface StockedSitesOfItem {
  itemId: StringObjectID;
  siteIds: StringObjectID[];
}

/* Version 1 */

export type MarkDeliveredTransactionResponse = Array<{
  sku: string;
  quantityDelivered: Array<{
    locationId: StringObjectID;
    subTransactionId: StringObjectID;
  }>;
}>;
