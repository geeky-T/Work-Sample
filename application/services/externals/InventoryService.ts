import { AssetInventoryItemWithLocation, MinimalSiteResponseType } from '@custom-types/InventoryTypes/response';
import { ForbiddenError } from '@procurenetworks/backend-utils';
import { ItemEntity, StringObjectID, UserContext } from '@procurenetworks/inter-service-contracts';
import { groupBy, keyBy } from 'lodash';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { appConfigs } from '../../appConfigs';
import {
  CategoryService,
  ItemLocationService,
  ItemService,
  LocationService,
  PartnerTenantService,
} from '../../transport/__grpc/client/services';

class InventoryService {
  #_cache: NodeCache;

  constructor() {
    this.#_cache = new NodeCache({ checkperiod: 90, stdTTL: 240 });
  }

  async getInventoryItemsBasedOnSku(skus: string[], userContext: UserContext): Promise<ItemEntity.PaginatedItemsPayload> {
    const paginatedItems = await ItemService.getPaginatedItems(
      { filters: { skus }, paginationProps: { limit: skus.length } },
      userContext,
    );
    return paginatedItems;
  }

  async getStockedSiteIdsOfItem(itemId: StringObjectID, userContext: UserContext): Promise<StringObjectID[]> {
    if (this.#_cache.has(`siteIds${itemId.toString()}${userContext.tenantId.toString()}`)) {
      return this.#_cache.get(`siteIds${itemId.toString()}${userContext.tenantId.toString()}`) as StringObjectID[];
    }
    const { stringObjectIDFieldValues: siteIds } = await ItemLocationService.getDistinctValuesForAllItemLocation(
      {
        filters: {
          itemIds: [itemId],
          _or: [{ nonZeroAvailableQuantity: true }, { nonZeroAvailableQuantityFromLocations: true }],
        },
        field: 'siteId',
      },
      userContext,
    );
    this.#_cache.set(`siteIds${itemId.toString()}${userContext.tenantId.toString()}`, siteIds);
    return siteIds || [];
  }

  async getStockedSiteIdsOfItems(itemIds: StringObjectID[], userContext: UserContext): Promise<StringObjectID[]> {
    const { stringObjectIDFieldValues: siteIds } = await ItemLocationService.getDistinctValuesForAllItemLocation(
      {
        filters: { itemIds, _or: [{ nonZeroTotalQuantity: true, recentOnly: false }] },
        field: 'siteId',
      },
      userContext,
    );
    return siteIds || [];
  }

  async getStockedSitesOfItem(itemIds: StringObjectID[], userContext: UserContext): Promise<MinimalSiteResponseType[]> {
    const siteIds = await this.getStockedSiteIdsOfItems(itemIds, userContext);
    if (siteIds.length > 0) {
      const { locations: sites } = await LocationService.getAllLocations({ filters: { locationIds: siteIds } }, userContext);
      return sites.map((site) => ({ id: site._id, name: site.name }));
    }
    return [];
  }

  async getItemDetailsWithLocation(
    itemIds: StringObjectID[],
    siteId: StringObjectID,
    userContext: UserContext,
  ): Promise<AssetInventoryItemWithLocation[]> {
    /** Fetch item locations & items */
    const [{ itemLocations }, { items }] = await Promise.all([
      ItemLocationService.getAllItemLocations(
        { filters: { itemIds, siteIds: [siteId], nonZeroTotalQuantity: true } },
        userContext,
      ),
      ItemService.getAllItems({ filters: { itemIds, statuses: Object.values(ItemEntity.ItemStatusEnum) } }, userContext),
    ]);
    const locationIds = itemLocations.map(({ locationId }) => locationId);
    const categoryIds = items.map(({ categoryId }) => categoryId);
    const [{ categories }, { locations }] = await Promise.all([
      CategoryService.getAllCategories({ filters: { categoryIds } }, userContext),
      LocationService.getAllLocations({ filters: { locationIds } }, userContext),
    ]);

    /** Merge and transform */
    const itemLocationsByItemIdAndLocationId = groupBy(itemLocations, (itemLocation) => `${itemLocation.itemId.toString()}`);
    const itemsByItemId = keyBy(items, (item) => `${item._id.toString()}`);
    const categoriesBycategoryId = keyBy(categories, (category) => `${category._id.toString()}`);
    const locationsBylocationId = keyBy(locations, (location) => `${location._id.toString()}`);

    const assetInventoryItemWithLocations: AssetInventoryItemWithLocation[] = [];
    itemIds.forEach((itemId) => {
      assetInventoryItemWithLocations.push({
        active_flag: itemsByItemId[itemId.toString()].status === ItemEntity.ItemStatusEnum.ACTIVE ? 1 : 0,
        brand: itemsByItemId[itemId.toString()].brand,
        category_id: itemsByItemId[itemId.toString()].categoryId,
        category_name: categoriesBycategoryId[itemsByItemId[itemId.toString()].categoryId.toString()]?.name,
        cost: !!itemsByItemId[itemId.toString()].costOverride
          ? (
              (itemsByItemId[itemId.toString()].unitCost || 0) *
              (1 + (itemsByItemId[itemId.toString()].costOverride as number) / 100)
            ).toString()
          : (itemsByItemId[itemId.toString()].unitCost || 0).toString(),
        description: itemsByItemId[itemId.toString()].description,
        id: itemId.toString(),
        locations: (itemLocationsByItemIdAndLocationId[`${itemId.toString()}`] || []).map((itemLocation) => ({
          id: itemLocation._id.toString(),
          name: locationsBylocationId[itemLocation.locationId.toString()].name,
          quantity: itemLocation.availableQuantity,
        })),
        sku: itemsByItemId[itemId.toString()].sku,
        title: itemsByItemId[itemId.toString()].title,
        type: itemsByItemId[itemId.toString()].type,
        image: itemsByItemId[itemId.toString()].attachments[0]?.url,
        model: (itemsByItemId[itemId.toString()] as any).mName,
        product_code: itemsByItemId[itemId.toString()].externalProductCodes[0]?.code,
        shipping_fees: itemsByItemId[itemId.toString()].costOverride?.toString(),
      });
    });
    return assetInventoryItemWithLocations;
  }

  async getAccessibleCategoryIdsOfPartnerTenant(
    tenantId: StringObjectID,
    userContext: UserContext,
  ): Promise<StringObjectID[]> {
    const { currentUserInfo } = userContext;
    if (this.#_cache.has(`${currentUserInfo._id.toString()}${tenantId.toString()}`)) {
      return this.#_cache.get(`${currentUserInfo._id.toString()}${tenantId.toString()}`) as StringObjectID[];
    }
    const isSuperAdmin = userContext.currentUserInfo.scopedRoles.some(
      ({ roleId }) => roleId.toString() === appConfigs.superAdminRoleId,
    );
    const {
      partnerTenants: [partnerTenant],
    } = await PartnerTenantService.getAllPartnerTenants(
      {
        filters: {
          allowedUserIds: isSuperAdmin ? [] : [currentUserInfo._id],
          parentTenantIds: [tenantId],
        },
      },
      userContext,
    );
    if (!partnerTenant) {
      throw new ForbiddenError({
        message: 'You do not have access to order items of the selected organization. Please check and try again.',
        where: `${__filename} - ${this.getAccessibleCategoryIdsOfPartnerTenant.name}`,
        params: { tenantId },
      });
    }
    this.#_cache.set(`${currentUserInfo._id.toString()}${tenantId.toString()}`, partnerTenant.accessibleCategoryIds);
    return partnerTenant.accessibleCategoryIds.length > 0
      ? partnerTenant.accessibleCategoryIds
      : [new mongoose.Types.ObjectId()];
  }
}

export default new InventoryService();
