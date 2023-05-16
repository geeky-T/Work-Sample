import { OrderRequestItemEntity, StringObjectID } from '@procurenetworks/inter-service-contracts';

export type CreateOrderRequestItemRepositoryInput = Omit<
  OrderRequestItemEntity.OrderRequestItemSchema,
  'createdAt' | 'updatedAt' | '__v'
> & { originalOrderRequestItemId?: StringObjectID };

export type UpdateOrderRequestItemStatusRepositoryInput = {
  nonRemovableNote?: OrderRequestItemEntity.OrderRequestItemNonRemovableNoteSchema;
  orderRequestItemId: StringObjectID;
  status: OrderRequestItemEntity.OrderRequestItemStatusEnum;
  statusHistory: OrderRequestItemEntity.OrderRequestItemStatusHistorySchema;
  updatedById: StringObjectID;
};

export type UpdateOrderRequestItemRepositoryInput = Partial<
  Omit<OrderRequestItemEntity.OrderRequestItemSchema, 'entityIdInSourceTenant'>
> & {
  _id: StringObjectID;
};
