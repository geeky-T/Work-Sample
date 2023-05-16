import { Entity, ShippingTransactionEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { ShippingServiceRPCClient } from './rpcClient';

export class ShippingTransactionService extends ShippingServiceRPCClient {
  /* Queries */
  public static async getAllShippingTransactions(
    inputProps: ShippingTransactionEntity.GetAllShippingTransactionsInput,
    context: UserContext,
  ): Promise<ShippingTransactionEntity.GetAllShippingTransactionsPayload> {
    const allShippingContainerResponse = await this.rpcCall<
      ShippingTransactionEntity.GetAllShippingTransactionsInput,
      ShippingTransactionEntity.GetAllShippingTransactionsPayload
    >('getAllShippingTransactions')(inputProps, context);
    return allShippingContainerResponse;
  }

  /* Mutations */
  public static async createShippingTransactionsBasedOnOrderRequest(
    inputProps: ShippingTransactionEntity.CreateShippingTransactionsBasedOnOrderRequestInputs,
    context: UserContext,
  ): Promise<ShippingTransactionEntity.CreateShippingTransactionsPayload> {
    const createShippingTransactionsResponse = await this.rpcCall<
      ShippingTransactionEntity.CreateShippingTransactionsBasedOnOrderRequestInputs,
      ShippingTransactionEntity.CreateShippingTransactionsPayload
    >('createShippingTransactionsBasedOnOrderRequest')(inputProps, context);
    return createShippingTransactionsResponse;
  }

  public static async markShippingTransactionsOfTrackingIdsAsDelivered(
    inputProps: ShippingTransactionEntity.MarkShippingTransactionsOfTrackingIdsAsDeliveredInput,
    context: UserContext,
  ): Promise<Entity.MutationResponse> {
    const markShippingTransactionsOfTrackingIdsAsDeliveredResponse = await this.rpcCall<
      ShippingTransactionEntity.MarkShippingTransactionsOfTrackingIdsAsDeliveredInput,
      Entity.MutationResponse
    >('markShippingTransactionsOfTrackingIdsAsDelivered')(inputProps, context);
    return markShippingTransactionsOfTrackingIdsAsDeliveredResponse;
  }
}
