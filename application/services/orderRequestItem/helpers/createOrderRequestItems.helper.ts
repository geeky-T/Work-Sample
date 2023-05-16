import { CreateOrderRequestItemRepositoryInput } from '@custom-types/OrderRequestItem';
import { logger, ValidationError } from '@procurenetworks/backend-utils';
import { Entity, OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { isFileStringInBase64 } from '@utils/utilValidator';
import mongoose from 'mongoose';
import InventoryService from '../../externals/InventoryService';
import { uploadFileAndGetFileUrl } from './itemImageUploader';

// Assigns order item type based on sku initials.
const _getOrderItemType = (sku = '') => {
  if (sku.startsWith('AST')) {
    return OrderRequestItemEntity.OrderRequestItemTypeEnum.ASSET;
  }
  if (sku.startsWith('INV')) {
    return OrderRequestItemEntity.OrderRequestItemTypeEnum.INVENTORY;
  }
  return OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU;
};

const _setImageUrlInOrderItemByUploadingImage = async (orderRequestItems: CreateOrderRequestItemRepositoryInput[]) => {
  const updatedOrderItems = orderRequestItems.map(async (element) => {
    if (element.imageUrl && isFileStringInBase64(element.imageUrl)) {
      const uploadedImageUrl = await uploadFileAndGetFileUrl(element.imageUrl);
      // eslint-disable-next-line no-param-reassign
      element.imageUrl = uploadedImageUrl;
    }
    return element;
  });

  return Promise.all(updatedOrderItems);
};

export const parseCreateOrderRequestItemsInput = async (
  createOrderRequestItemsInput: Array<OrderRequestItemEntity.CreateOrderRequestItemInput>,
  userContext: UserContext,
): Promise<CreateOrderRequestItemRepositoryInput[]> => {
  /* Extracts sku from items to fetch related data from inventory */
  const itemsSku: string[] = createOrderRequestItemsInput.reduce(
    (result, item) => (item.sku ? [...result, item.sku] : result),
    [] as string[],
  );

  logger.info({ message: 'VALIDATE ITEMS: Fetching Inventory details' });
  const paginatedItems =
    itemsSku.length !== 0 ? await InventoryService.getInventoryItemsBasedOnSku(itemsSku, userContext) : { edges: [] };
  const items = paginatedItems.edges.map(({ node }) => node);
  let orderRequestItems: CreateOrderRequestItemRepositoryInput[] = createOrderRequestItemsInput.map((orderRequestItem) => {
    const correspondingItemFromInventory = items.find((elem) => elem.sku === orderRequestItem.sku);
    if (orderRequestItem.sku) {
      if (!correspondingItemFromInventory) {
        throw new ValidationError({
          debugMessage: `The SKU is not valid/does not exist. Please select another SKU.`,
          message: `An item in your order request is no longer available. Please create a new order request or edit your existing order request.`,
          params: { createOrderRequestItemsInput, invalidSKU: orderRequestItem.sku },
          where: `${__filename} - ${parseCreateOrderRequestItemsInput.name}`,
        });
      }
      return {
        ...orderRequestItem,
        _id: orderRequestItem._id || new mongoose.Types.ObjectId(),
        entitySource: orderRequestItem.entityIdInSourceTenant
          ? Entity.EntitySourceEnum.EXTERNAL
          : Entity.EntitySourceEnum.INTERNAL,
        permissions: [],
        projectId: orderRequestItem.projectId || undefined,
        categoryId: correspondingItemFromInventory.categoryId,
        cost: !!correspondingItemFromInventory.costOverride
          ? (correspondingItemFromInventory.unitCost || 0) *
            (1 + (correspondingItemFromInventory.costOverride as number) / 100)
          : correspondingItemFromInventory.unitCost || 0,
        createdById: userContext.currentUserInfo._id,
        description: correspondingItemFromInventory.description,
        identificationHistory: [],
        imageUrl: correspondingItemFromInventory.attachments && correspondingItemFromInventory.attachments[0]?.url,
        itemId: correspondingItemFromInventory._id,
        status: orderRequestItem.status || OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
        statusHistory: orderRequestItem.statusHistory || [
          {
            createdAt: userContext.requestTimestamp,
            createdById: userContext.currentUserInfo._id,
            status: orderRequestItem.status || OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
          },
        ],
        tenantId: userContext.tenantId,
        title: correspondingItemFromInventory.title,
        trackingDetails: [],
        trackingHistory: [],
        transactionDetails: [],
        transactionHistory: [],
        type: _getOrderItemType(orderRequestItem.sku),
        updatedById: userContext.currentUserInfo._id,
      };
    }
    return {
      ...orderRequestItem,
      _id: orderRequestItem._id || new mongoose.Types.ObjectId(),
      entitySource: orderRequestItem.entityIdInSourceTenant
        ? Entity.EntitySourceEnum.EXTERNAL
        : Entity.EntitySourceEnum.INTERNAL,
      permissions: [],
      projectId: orderRequestItem.projectId || undefined,
      createdById: userContext.currentUserInfo._id,
      identificationHistory: [
        {
          createdAt: userContext.requestTimestamp,
          createdById: userContext.currentUserInfo._id,
          description: orderRequestItem.description ? orderRequestItem.description : undefined,
          imageUrl: orderRequestItem.imageUrl ? orderRequestItem.imageUrl : undefined,
          upcCode: orderRequestItem.upcCode ? orderRequestItem.upcCode : undefined,
          website: orderRequestItem.website ? orderRequestItem.website : undefined,
        },
      ],
      status:
        orderRequestItem.status ||
        _getOrderItemType(orderRequestItem.sku) === OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU
          ? OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED
          : OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
      statusHistory: orderRequestItem.statusHistory || [
        {
          createdAt: userContext.requestTimestamp,
          createdById: userContext.currentUserInfo._id,
          status: OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
        },
      ],
      tenantId: userContext.tenantId,
      trackingDetails: [],
      trackingHistory: [],
      transactionDetails: [],
      transactionHistory: [],
      type: _getOrderItemType(orderRequestItem.sku),
      updatedById: userContext.currentUserInfo._id,
    };
  });

  orderRequestItems = await _setImageUrlInOrderItemByUploadingImage(orderRequestItems);

  return orderRequestItems;
};
