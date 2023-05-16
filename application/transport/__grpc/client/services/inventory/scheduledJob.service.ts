import { logger } from '@procurenetworks/backend-utils';
import { Entity, ScheduledJobEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { InventoryServiceRPCClient } from './rpcClient';

export class ScheduledJobService extends InventoryServiceRPCClient {
  /* Mutation */
  static async createScheduledJob(
    input: ScheduledJobEntity.CreateScheduledJobInput,
    userContext: UserContext,
  ): Promise<ScheduledJobEntity.CreateScheduleJobPayload> {
    try {
      logger.debug({ message: 'ScheduledJob Service: createScheduledJob', payload: { input } });
      const payload = await this.rpcCall<
        ScheduledJobEntity.CreateScheduledJobInput,
        ScheduledJobEntity.CreateScheduleJobPayload
      >('createScheduledJob')(input, userContext);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  static async updateScheduledJob(
    input: ScheduledJobEntity.UpdateScheduledJobsInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    logger.debug({ message: 'ScheduledJob Service: updateScheduledJob', payload: { input } });
    const payload = await this.rpcCall<ScheduledJobEntity.UpdateScheduledJobsInput, Entity.MutationResponse>(
      'updateScheduledJob',
    )(input, userContext);
    return payload;
  }

  /** Queries */
  static async getAllScheduledJobs(
    input: ScheduledJobEntity.GetAllScheduledJobsInput,
    userContext: UserContext,
  ): Promise<ScheduledJobEntity.GetAllScheduledJobsPayload> {
    logger.debug({ message: 'ScheduledJob Service: getAllScheduledJobs', payload: { input } });
    const payload = await this.rpcCall<
      ScheduledJobEntity.GetAllScheduledJobsInput,
      ScheduledJobEntity.GetAllScheduledJobsPayload
    >('getAllScheduledJobs')(input, userContext);
    return payload;
  }
  static async getPaginatedScheduledJobs(
    input: ScheduledJobEntity.GetPaginatedScheduledJobsInput,
    userContext: UserContext,
  ): Promise<ScheduledJobEntity.PaginatedScheduledJobsPayload> {
    logger.debug({
      message: 'ScheduledJob Service: getPaginatedScheduledJobs',
      payload: { input },
    });
    const payload = await this.rpcCall<
      ScheduledJobEntity.GetPaginatedScheduledJobsInput,
      ScheduledJobEntity.PaginatedScheduledJobsPayload
    >('getPaginatedScheduledJobs')(input, userContext);
    return payload;
  }
  static async getPaginatedScheduledJobsDeprecated(
    input: ScheduledJobEntity.GetPaginatedScheduledJobsInput,
    userContext: UserContext,
  ): Promise<Entity.GetPaginatedEntitiesPayload<ScheduledJobEntity.ScheduledJobSchema>> {
    logger.debug({
      message: 'ScheduledJob Service: getPaginatedScheduledJobsDeprecated',
      payload: { input },
    });
    const payload = await this.rpcCall<
      ScheduledJobEntity.GetPaginatedScheduledJobsInput,
      Entity.GetPaginatedEntitiesPayload<ScheduledJobEntity.ScheduledJobSchema>
    >('getPaginatedScheduledJobsDeprecated')(input, userContext);
    return payload;
  }
}
