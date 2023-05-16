import { PickListEntity } from '@procurenetworks/inter-service-contracts';

export type CreatePickListsRepositoryInput = Omit<PickListEntity.PickListSchema, '_id' | 'createdAt' | 'updatedAt' | '__v'>;
