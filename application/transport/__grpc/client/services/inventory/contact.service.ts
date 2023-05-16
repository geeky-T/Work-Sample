import { logger } from '@procurenetworks/backend-utils';
import { ContactEntity, Entity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class ContactService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createContact(
    input: ContactEntity.CreateContactInput,
    userContext: UserContext,
  ): Promise<ContactEntity.CreateContactPayload> {
    try {
      logger.debug({ message: 'Contact Service: createContact', payload: { input } });
      const payload = await this.rpcCall<ContactEntity.CreateContactInput, ContactEntity.CreateContactPayload>(
        'createContact',
      )(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateContact(
    input: ContactEntity.UpdateContactInput,
    userContext: UserContext,
  ): Promise<ContactEntity.UpdateContactPayload> {
    logger.debug({ message: 'Contact Service: updateContact', payload: { input } });
    const payload = await this.rpcCall<ContactEntity.UpdateContactInput, ContactEntity.UpdateContactPayload>(
      'updateContact',
    )(input, userContext);
    return payload;
  }

  static async deleteContacts(
    input: ContactEntity.DeleteContactsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'Contact Service: deleteContacts', payload: { input } });
    const payload = await this.rpcCall<ContactEntity.DeleteContactsInput, Entity.MutationResponse>('deleteContacts')(
      input,
      userContext,
    );
    return payload;
  }

  /** Queries */
  static async getAllContacts(
    input: ContactEntity.GetAllContactsInput,
    userContext: UserContext,
  ): Promise<ContactEntity.GetAllContactsPayload> {
    logger.debug({ message: 'Contact Service: getAllContacts', payload: { input } });
    const payload = await this.rpcCall<ContactEntity.GetAllContactsInput, ContactEntity.GetAllContactsPayload>(
      'getAllContacts',
    )(input, userContext);
    return payload;
  }
  static async getPaginatedContacts(
    input: ContactEntity.GetPaginatedContactsInput,
    userContext: UserContext,
  ): Promise<ContactEntity.PaginatedContactsPayload> {
    logger.debug({ message: 'Contact Service: getPaginatedContacts', payload: { input } });
    const payload = await this.rpcCall<ContactEntity.GetPaginatedContactsInput, ContactEntity.PaginatedContactsPayload>(
      'getPaginatedContacts',
    )(input, userContext);
    return payload;
  }
}
