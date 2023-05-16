import { CreateOrderRequestRepositoryInput } from '@custom-types/OrderRequest';
import { Entity, OrderRequestEntity, OrderRequestItemEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import generateUniqueId from 'generate-unique-id';
import mongoose from 'mongoose';
import { getPermissionStringsForOrder } from './orderRequestUtils.helper';
import { createSearchTermsForOrderRequest } from './searchTerms.helper';

const _generateOrderRequestCode = () => {
  return `${generateUniqueId({ length: 7, useLetters: false })}`;
};

const _areAllItemNonStockedItems = (items: OrderRequestEntity.CreateOrderRequestInput['items']) =>
  items.every((orderRequestItem) => orderRequestItem.type === OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU);

export const parseCreateOrderRequestInput = async (
  createOrderRequestInput: OrderRequestEntity.CreateOrderRequestInput,
  userContext: UserContext,
): Promise<CreateOrderRequestRepositoryInput> => {
  const orderRequestCode = _generateOrderRequestCode();
  const searchTerms = createSearchTermsForOrderRequest(createOrderRequestInput.items);
  const isSpecialOrder = _areAllItemNonStockedItems(createOrderRequestInput.items);
  const permissions = await getPermissionStringsForOrder(createOrderRequestInput, userContext);
  const orderRequest: CreateOrderRequestRepositoryInput = {
    _id: new mongoose.Types.ObjectId(),
    permissions,
    type: createOrderRequestInput.type,
    parentTenantId: createOrderRequestInput.parentTenantId,
    childTenantId: createOrderRequestInput.childTenantId,
    billToSiteId: createOrderRequestInput.billToSiteId,
    createdById: userContext.currentUserInfo._id,
    deliverToId: createOrderRequestInput.deliverToId,
    departmentId: createOrderRequestInput.departmentId,
    destinationSiteId: createOrderRequestInput.destinationSiteId,
    dueDate: new Date(createOrderRequestInput.dueDate).setHours(12, 0, 0, 0).toString(),
    entityIdInSourceTenant: createOrderRequestInput.entityIdInSourceTenant,
    entitySource: createOrderRequestInput.entityIdInSourceTenant
      ? Entity.EntitySourceEnum.EXTERNAL
      : Entity.EntitySourceEnum.INTERNAL,
    fulfillingSiteIds: [],
    leastItemStatus: isSpecialOrder
      ? OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED
      : OrderRequestItemEntity.OrderRequestItemStatusEnum.OPEN,
    orderRequestCode: `ORD${orderRequestCode}`,
    searchTerms,
    status: OrderRequestEntity.OrderRequestStatusEnum.ACTIVE,
    tenantId: userContext.tenantId,
  };
  return orderRequest;
};
