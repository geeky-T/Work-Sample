import { logger } from '@procurenetworks/backend-utils';
import { Entity, TransactionEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class TransactionService extends InventoryServiceRPCClient {
  /** Mutations */
  static async createMoveTransactions(
    input: TransactionEntity.CreateMoveTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({ message: 'Transaction Service: createMoveTransactions', payload: { input } });
      const payload = await this.rpcCall<
        TransactionEntity.CreateMoveTransactionsInput,
        TransactionEntity.CreateTransactionsPayload
      >('createMoveTransactions')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }
  static async createRemoveTransactions(
    input: TransactionEntity.CreateRemoveTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({
        message: 'Transaction Service: createRemoveTransactions',
        payload: { input },
      });
      const payload = await this.rpcCall<
        TransactionEntity.CreateRemoveTransactionsInput,
        TransactionEntity.CreateTransactionsPayload
      >('createRemoveTransactions')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }
  static async createAuditTransactions(
    input: TransactionEntity.CreateAuditTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({ message: 'Transaction Service: createAuditTransactions', payload: { input } });
      const payload = await this.rpcCall<
        TransactionEntity.CreateAuditTransactionsInput,
        TransactionEntity.CreateTransactionsPayload
      >('createAuditTransactions')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }
  static async createCheckOutTransactions(
    input: TransactionEntity.CreateCheckOutTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({
        message: 'Transaction Service: createCheckOutTransactions',
        payload: { input },
      });
      const payload = await this.rpcCall<
        TransactionEntity.CreateCheckOutTransactionsInput,
        TransactionEntity.CreateTransactionsPayload
      >('createCheckOutTransactions')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }
  static async createCheckInTransaction(
    input: TransactionEntity.CreateCheckInTransactionInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({
        message: 'Transaction Service: createCheckInTransaction',
        payload: { input },
      });
      const payload = await this.rpcCall<
        TransactionEntity.CreateCheckInTransactionInput,
        TransactionEntity.CreateTransactionsPayload
      >('createCheckInTransaction')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }
  static async createRestockTransactions(
    input: TransactionEntity.CreateRestockTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.CreateTransactionsPayload> {
    try {
      logger.debug({
        message: 'Transaction Service: createRestockTransactions',
        payload: { input },
      });
      const payload = await this.rpcCall<
        TransactionEntity.CreateRestockTransactionsInput,
        TransactionEntity.CreateTransactionsPayload
      >('createRestockTransactions')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async markMoveTransactionsComplete(
    input: TransactionEntity.MarkMoveTransactionsCompleteInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({
      message: 'TransactionService Service: markMoveTransactionsComplete',
      payload: { input },
    });
    const payload = await this.rpcCall<TransactionEntity.MarkMoveTransactionsCompleteInput, Entity.MutationResponse>(
      'markMoveTransactionsComplete',
    )(input, userContext);
    return payload;
  }

  static async deleteInTransitTransactions(
    input: TransactionEntity.DeleteInTransitTransactionsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({
      message: 'TransactionService Service: deleteInTransitTransaction',
      payload: { input },
    });
    const payload = await this.rpcCall<TransactionEntity.DeleteInTransitTransactionsInput, Entity.MutationResponse>(
      'deleteInTransitTransactions',
    )(input, userContext);
    return payload;
  }

  /** Queries */
  static async getAllTransactions(
    input: TransactionEntity.GetAllTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.GetAllTransactionsPayload> {
    logger.debug({ message: 'Transaction Service: getAllTransactions', payload: { input } });
    const payload = await this.rpcCall<
      TransactionEntity.GetAllTransactionsInput,
      TransactionEntity.GetAllTransactionsPayload
    >('getAllTransactions')(input, userContext);
    return payload;
  }
  static async getPaginatedTransactions(
    input: TransactionEntity.GetPaginatedTransactionsInput,
    userContext: UserContext,
  ): Promise<TransactionEntity.PaginatedTransactionsPayload> {
    logger.debug({ message: 'Transaction Service: getPaginatedTransactions', payload: { input } });
    const payload = await this.rpcCall<
      TransactionEntity.GetPaginatedTransactionsInput,
      TransactionEntity.PaginatedTransactionsPayload
    >('getPaginatedTransactions')(input, userContext);
    return payload;
  }
}
