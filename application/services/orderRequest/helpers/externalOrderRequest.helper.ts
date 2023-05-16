import { InternalServerError, ValidationError } from '@procurenetworks/backend-utils';
import {
  AssetItemEntity,
  CategoryEntity,
  InventoryItemEntity,
  ItemEntity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  StringObjectID,
  TenantEntity,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { uniq } from 'lodash';
import groupBy from 'lodash/groupBy';
import {
  AssetItemService,
  CategoryService,
  InventoryItemService,
  ItemService,
  LocationService,
  TenantService,
} from '../../../transport/__grpc/client/services';
import { parseCreateOrderRequestInput } from './createOrderRequest.helper';

const parseDuplicateParentToChildCategoriesPayload = (
  parentCategories: Array<CategoryEntity.CategorySchema>,
  parentTenant: TenantEntity.TenantSchema,
  userContext: UserContext,
): Array<CategoryEntity.CreateCategoryInput> => {
  return parentCategories.map(({ applicableOn, name, assetFlag, inventoryFlag, _id }) => ({
    applicableOn,
    name: `${parentTenant.name} - ${name}`,
    assetFlag,
    categoryManagerIds: [userContext.currentUserInfo._id],
    inventoryFlag,
    entityIdInSourceTenant: _id,
  }));
};

const parseDuplicateParentAssetItemPayload = (
  item: AssetItemEntity.AssetItemSchema,
  parentCategoryToChildCategoryIdMapping: Record<string, StringObjectID>,
): AssetItemEntity.CreateAssetItemInput => {
  const {
    _id,
    attachments,
    brand,
    categoryId,
    costOverride,
    description,
    externalProductCodes,
    mName,
    modelNumber,
    purchaseDate,
    serialNumber,
    title,
    unitCost,
    warrantyExpiryDate,
    replacementDate,
  } = item;
  return {
    attachments,
    brand,
    categoryId: parentCategoryToChildCategoryIdMapping[categoryId as string],
    costOverride,
    description,
    externalProductCodes,
    mName,
    modelNumber,
    pickableThroughOrderRequest: true,
    purchaseDate,
    serialNumber,
    entityIdInSourceTenant: _id,
    title,
    type: ItemEntity.ItemTypeEnum.ASSET,
    unitCost,
    warrantyExpiryDate,
    replacementDate,
  };
};

const parseDuplicateParentInventoryItemPayload = (
  item: InventoryItemEntity.InventoryItemSchema,
  parentCategoryToChildCategoryIdMapping: Record<string, StringObjectID>,
): InventoryItemEntity.CreateInventoryItemInput => {
  const { _id, attachments, brand, categoryId, costOverride, description, externalProductCodes, mName, title, unitCost } =
    item;
  return {
    attachments,
    brand,
    categoryId: parentCategoryToChildCategoryIdMapping[categoryId as string],
    costOverride,
    description,
    externalProductCodes,
    mName,
    pickableThroughOrderRequest: true,
    entityIdInSourceTenant: _id,
    title,
    type: ItemEntity.ItemTypeEnum.INVENTORY,
    unitCost,
  };
};

const parseDuplicateParentItemToChildItems = (
  parentItems: ItemEntity.ItemSchema[],
  parentCategoryToChildCategoryIdMapping: Record<string, StringObjectID>,
): (AssetItemEntity.CreateAssetItemInput | InventoryItemEntity.CreateInventoryItemInput)[] => {
  return parentItems.map((item) => {
    if (item.type === ItemEntity.ItemTypeEnum.ASSET) {
      return parseDuplicateParentAssetItemPayload(
        item as AssetItemEntity.AssetItemSchema,
        parentCategoryToChildCategoryIdMapping,
      );
    }
    return parseDuplicateParentInventoryItemPayload(
      item as InventoryItemEntity.InventoryItemSchema,
      parentCategoryToChildCategoryIdMapping,
    );
  });
};

export const getSiteIdOfPartnerTenant = async (tenantIdOfPartnerTenant: StringObjectID, currentUserContext: UserContext) => {
  const { locations: partnerTenantSites } = await LocationService.getAllLocations(
    { filters: { tenantIdsOfPartnerTenant: [tenantIdOfPartnerTenant] }, projection: { _id: 1 } },
    currentUserContext,
  );
  return partnerTenantSites[0]._id;
};

export const duplicateAndGetItemsInChildTenant = async (
  parentTenantOrderRequestItems: OrderRequestEntity.CreateOrderRequestInput['items'],
  childUserContext: UserContext,
  parentUserContext: UserContext,
): Promise<ItemEntity.ItemSchema[]> => {
  const parentTenantItemIds = uniq(parentTenantOrderRequestItems.map((item) => item.itemId?.toString() as string));

  /** separating existing and new items for the child tenant to duplicate. **/
  const { items: existingItemsInChildTenant } = await ItemService.getAllItems(
    {
      filters: {
        _or: [{ entityIdsInSourceTenant: parentTenantItemIds }, { itemIds: parentTenantItemIds }],
      },
    },
    childUserContext,
  );

  const isAnyOrderRequestItemInternal = existingItemsInChildTenant.some(
    (orderRequestItem) => !orderRequestItem.entityIdInSourceTenant,
  );

  if (isAnyOrderRequestItemInternal) {
    throw new ValidationError({
      debugMessage: 'User added internal item in external order request.',
      message: 'Internal item cannot be part of an order request to an partner organization.',
      params: { parentTenantOrderRequestItems },
      where: `${__filename} - ${duplicateAndGetItemsInChildTenant.name}`,
    });
  }

  const existingParentItemIdsInChildTenant = existingItemsInChildTenant.map((item) =>
    parentTenantItemIds.includes(item._id.toString()) ? item._id.toString() : item.entityIdInSourceTenant?.toString(),
  );

  const newItemsBasedOnOrderRequestForChildTenant = parentTenantOrderRequestItems.filter(
    (item) => !existingParentItemIdsInChildTenant.includes(item.itemId?.toString() as string),
  );
  const newParentItemIdsForChildTenant = newItemsBasedOnOrderRequestForChildTenant.map(
    (item) => item.itemId as StringObjectID,
  );

  if (newParentItemIdsForChildTenant.length === 0) {
    return existingItemsInChildTenant;
  }

  const { items: newParentItemsForChildTenant } = await ItemService.getAllItems(
    { filters: { itemIds: newParentItemIdsForChildTenant } },
    parentUserContext,
  );

  /** separating existing and new categories for the child tenant to duplicate based on the new items to duplicate. **/
  const parentCategoryIdsForNewItemsInChildTenant = newParentItemsForChildTenant.map(
    (item) => item.categoryId as StringObjectID,
  );
  const { categories: existingParentCategoriesInChildTenant } = await CategoryService.getAllCategories(
    { filters: { entityIdsInSourceTenant: parentCategoryIdsForNewItemsInChildTenant } },
    childUserContext,
  );

  const existingParentCategoryIdsInChildTenant = existingParentCategoriesInChildTenant.map(
    (category) => category.entityIdInSourceTenant as StringObjectID,
  );

  const newParentCategoryIdsForChildTenant = parentCategoryIdsForNewItemsInChildTenant.filter(
    (categoryId) => !existingParentCategoryIdsInChildTenant.includes(categoryId as string),
  );

  let categories = existingParentCategoriesInChildTenant;
  if (newParentCategoryIdsForChildTenant.length > 0) {
    const {
      tenants: [parentTenant],
    } = await TenantService.getAllTenants({ filters: { tenantIds: [parentUserContext.tenantId] } }, parentUserContext);

    const { categories: newParentCategoriesForChildTenant } = await CategoryService.getAllCategories(
      { filters: { categoryIds: newParentCategoryIdsForChildTenant } },
      parentUserContext,
    );

    const duplicateParentCategoryInChildTenantInputs = parseDuplicateParentToChildCategoriesPayload(
      newParentCategoriesForChildTenant,
      parentTenant,
      childUserContext,
    );
    /** separating existing and new categories for the child tenant to duplicate based on the new items to duplicate. **/
    const duplicateParentCategoriesInChildTenantPromise = duplicateParentCategoryInChildTenantInputs.map(
      (createCategoryInput) => CategoryService.createCategory(createCategoryInput, childUserContext),
    );
    const duplicatedChildCategoryResponses = await Promise.all(duplicateParentCategoriesInChildTenantPromise);
    const failedCategoryCreation = duplicatedChildCategoryResponses.filter((response) => !response.category);
    if (failedCategoryCreation.length) {
      throw new InternalServerError({
        error: new Error('unknown error occurred duplicating category in child, please refer organization-service logs'),
        where: `${__filename} - ${duplicateAndGetItemsInChildTenant.name}`,
        debugMessage: 'unknown error occurred duplicating category in child, please refer organization-service logs',
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { parentTenantOrderRequestItems, childUserContext, parentUserContext },
      });
    }

    categories = [
      ...categories,
      ...duplicatedChildCategoryResponses.map((response) => response.category),
    ] as CategoryEntity.CategorySchema[];
  }

  /** parsing input to create new item in child tenant with duplicated category ids. */
  const parentCategoryIdToChildCategoryIdMapping: Record<string, StringObjectID> = {};
  categories.forEach((category) => {
    parentCategoryIdToChildCategoryIdMapping[category.entityIdInSourceTenant as string] = category._id;
  });
  const createDuplicateItemInChildTenantInput = parseDuplicateParentItemToChildItems(
    newParentItemsForChildTenant,
    parentCategoryIdToChildCategoryIdMapping,
  );
  const duplicateParentItemsInChildTenantInputsByType = groupBy(createDuplicateItemInChildTenantInput, 'type');

  /** Duplicating parent tenant items in child tenant with other duplicated entities(category). */
  const {
    [ItemEntity.ItemTypeEnum.ASSET]: newParentAssetItemForChildTenant = [],
    [ItemEntity.ItemTypeEnum.INVENTORY]: newParentInventoryItemForChildTenant = [],
  } = duplicateParentItemsInChildTenantInputsByType;

  const duplicatedParentItemsInChildTenant: ItemEntity.ItemSchema[] = [];
  for (const newParentAssetItem of newParentAssetItemForChildTenant) {
    const { assetItem: createdAssetItemInChildTenant } = await AssetItemService.createAssetItem(
      newParentAssetItem as AssetItemEntity.CreateAssetItemInput,
      childUserContext,
    );
    if (createdAssetItemInChildTenant) {
      duplicatedParentItemsInChildTenant.push(createdAssetItemInChildTenant);
    }
  }
  for (const newParentInventoryItem of newParentInventoryItemForChildTenant) {
    const { inventoryItem: createdInventoryItemInChildTenant } = await InventoryItemService.createInventoryItem(
      newParentInventoryItem as InventoryItemEntity.CreateInventoryItemInput,
      childUserContext,
    );
    if (createdInventoryItemInChildTenant) {
      duplicatedParentItemsInChildTenant.push(createdInventoryItemInChildTenant);
    }
  }

  /** Merging existing parent tenant Items and new duplicated items from parent. */
  return [...existingItemsInChildTenant, ...duplicatedParentItemsInChildTenant];
};

export const parseCreateExternalOrderRequestInputForParentTenant = async (
  createExternalOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
  siteIdInParentTenant: StringObjectID,
  childUserContext: UserContext,
  parentUserContext: UserContext,
) => {
  const createOrderRequestInParentRepositoryInput: OrderRequestEntity.CreateOrderRequestInput = {
    billToSiteId: siteIdInParentTenant,
    destinationSiteId: siteIdInParentTenant,
    childTenantId: childUserContext.tenantId,
    items: createExternalOrderRequestInput.items,
    dueDate: createExternalOrderRequestInput.dueDate,
    type: createExternalOrderRequestInput.type,
    deliverToId: childUserContext.currentUserInfo._id,
  };

  return parseCreateOrderRequestInput(createOrderRequestInParentRepositoryInput, parentUserContext);
};

export const parseCreateExternalOrderRequestInputForChildTenant = async (
  {
    createExternalOrderRequestInput,
    duplicatedItems,
    parentUserContext,
    orderRequestItemsOfParentTenant,
  }: {
    createExternalOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput;
    duplicatedItems: ItemEntity.ItemSchema[];
    parentUserContext: UserContext;
    orderRequestItemsOfParentTenant: OrderRequestItemEntity.OrderRequestItemSchema[];
  },
  userContext: UserContext,
) => {
  const orderRequestItems: OrderRequestEntity.CreateOrderRequestInput['items'] = createExternalOrderRequestInput.items.map(
    (orderRequestItem) => {
      const duplicatedItem = duplicatedItems.find(
        (item) => item.entityIdInSourceTenant?.toString() === orderRequestItem.itemId?.toString(),
      ) as AssetItemEntity.AssetItemSchema | InventoryItemEntity.InventoryItemSchema;
      const orderRequestItemInParentTenant = orderRequestItemsOfParentTenant.find(
        (item) => item.itemId && item.itemId.toString() === duplicatedItem.entityIdInSourceTenant?.toString(),
      );
      return {
        cost: orderRequestItem.cost,
        quantity: orderRequestItem.quantity,
        type: orderRequestItem.type,
        categoryId: duplicatedItem.categoryId,
        itemId: duplicatedItem._id,
        sku: duplicatedItem.sku,
        skuInPartnerTenant: orderRequestItemInParentTenant?.sku,
        title: duplicatedItem.title,
        description: duplicatedItem.description,
        projectId: orderRequestItem.projectId,
        entityIdInSourceTenant: orderRequestItemInParentTenant?._id,
      };
    },
  );
  const createOrderRequestInChildTenantRepositoryInput = await parseCreateOrderRequestInput(
    {
      ...createExternalOrderRequestInput,
      entityIdInSourceTenant: orderRequestItemsOfParentTenant[0].orderRequestId,
      parentTenantId: parentUserContext.tenantId,
      items: orderRequestItems,
    },
    userContext,
  );

  return {
    createOrderRequestInChildTenantRepositoryInput,
    createOrderRequestItemsInChildTenantInput: orderRequestItems,
  };
};
