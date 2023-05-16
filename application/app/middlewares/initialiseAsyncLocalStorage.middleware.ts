import { AsyncLocalStorage } from '@procurenetworks/backend-utils';
import { DefaultContext, DefaultState, Next, ParameterizedContext } from 'koa';

export async function initializeAsyncLocalStorage(
  _context: ParameterizedContext<DefaultState, DefaultContext, any>,
  next: Next,
): Promise<void> {
  return AsyncLocalStorage.initCallback(next);
}
