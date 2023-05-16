import { OrderRequestEntity, StringObjectID } from '@procurenetworks/inter-service-contracts';

export type CreateOrderRequestRepositoryInput = Omit<
  OrderRequestEntity.OrderRequestSchema,
  'createdAt' | 'updatedAt' | '__v'
>;

export type UpdateOrderRequestRepositoryInput = {
  permissions: string[];
  billToSiteId: StringObjectID;
  deliverToId?: StringObjectID;
  departmentId?: StringObjectID;
  destinationSiteId: StringObjectID;
  searchTerms: string[];
  updatedAt: string;
  updatedById: StringObjectID;
};
