import { extractAuthToken } from '@app/middlewares/utils/auth.util';
import { AsyncLocalStorage } from '@procurenetworks/backend-utils';
import generateUniqueId from 'generate-unique-id';
import { DefaultContext, DefaultState, Next, ParameterizedContext } from 'koa';

/**
 * Generates a request context setter middleware for Koa v2.
 */
export const setRequestContext: () => (
  context: ParameterizedContext<DefaultState, DefaultContext, any>,
  next: Next,
) => Promise<void> = () => {
  return async (context: ParameterizedContext<DefaultState, DefaultContext, any>, next: Next) => {
    const authToken = extractAuthToken(context);
    let {
      request: {
        headers: { 'x-request-id': requestId },
      },
    } = context;
    if (!requestId) {
      requestId = generateUniqueId({
        excludeSymbols: ['0', 'o', 'O'],
        length: 10,
        useLetters: true,
        useNumbers: true,
      });
    }
    AsyncLocalStorage.set('requestId', requestId);
    AsyncLocalStorage.set('authToken', authToken);
    await next();
  };
};
