import { UpdateOrderRequestRepositoryInput } from '@custom-types/OrderRequest';
import { OrderRequestEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { getPermissionStringsForOrder } from './orderRequestUtils.helper';
import { createSearchTermsForOrderRequest } from './searchTerms.helper';

export const parseUpdateOrderRequestInput = async (
  { updates }: OrderRequestEntity.UpdateOrderRequestInput,
  existingOrderRequest: OrderRequestEntity.OrderRequestSchema,
  userContext: UserContext,
): Promise<UpdateOrderRequestRepositoryInput> => {
  const searchTerms = createSearchTermsForOrderRequest(updates.items);
  const permissions = await getPermissionStringsForOrder(updates, userContext, existingOrderRequest);
  const orderRequestUpdates: UpdateOrderRequestRepositoryInput = {
    permissions,
    billToSiteId: updates.billToSiteId,
    deliverToId: updates.deliverToId,
    departmentId: updates.departmentId,
    destinationSiteId: updates.destinationSiteId,
    searchTerms,
    updatedAt: new Date().toISOString(),
    updatedById: userContext.currentUserInfo._id,
  };
  return orderRequestUpdates;
};

export const parseUpdateOrderRequestInputForParentTenant = async (
  { updates }: OrderRequestEntity.UpdateOrderRequestInput,
  existingOrderRequest: OrderRequestEntity.OrderRequestSchema,
  userContext: UserContext,
): Promise<UpdateOrderRequestRepositoryInput> => {
  const searchTerms = createSearchTermsForOrderRequest(updates.items);
  const permissions = await getPermissionStringsForOrder(updates, userContext, existingOrderRequest);
  const orderRequestUpdates: UpdateOrderRequestRepositoryInput = {
    permissions,
    billToSiteId: updates.billToSiteId,
    deliverToId: updates.deliverToId,
    departmentId: updates.departmentId,
    destinationSiteId: updates.destinationSiteId,
    searchTerms,
    updatedAt: new Date().toISOString(),
    updatedById: userContext.currentUserInfo._id,
  };
  return orderRequestUpdates;
};
