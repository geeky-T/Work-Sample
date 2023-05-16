import { logger } from '@procurenetworks/backend-utils';
import { DefaultContext, DefaultState, Next, ParameterizedContext } from 'koa';

export async function logCurlRequest(
  context: ParameterizedContext<DefaultState, DefaultContext, any>,
  next: Next,
): Promise<void> {
  logger.info({ message: `Curl command for the request ${context.toCurl()}` });
  await next();
}
