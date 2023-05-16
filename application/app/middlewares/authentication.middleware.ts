/* eslint-disable no-param-reassign */
import { byPassTokenVerification, extractAuthToken } from '@app/middlewares/utils/auth.util';
import {
  AsyncLocalStorage,
  AuthenticationErrorCodeEnum,
  logger,
  ProcureError,
  StatusCodes,
} from '@procurenetworks/backend-utils';
import { validateAndExtractJWTPayload } from '@procurenetworks/inter-service-contracts';
import { DefaultContext, DefaultState, Next, ParameterizedContext } from 'koa';
import { UserContextV2Utils } from '../../utils/userAuthentication/userContextV2';

export const authMiddleware = async (
  context: ParameterizedContext<DefaultState, DefaultContext>,
  next: Next,
): Promise<any> => {
  logger.debug({ message: 'USER VALIDATION: Validating current user' });
  if (byPassTokenVerification(context.url)) {
    await next();
    return;
  }
  const accessToken = extractAuthToken(context);
  const requestId = AsyncLocalStorage.get('requestId');
  context.set('x-request-id', requestId);
  if (!accessToken) {
    logger.debug({ message: `No access token found` });
    throw new ProcureError({
      errorCode: AuthenticationErrorCodeEnum.TOKEN_NOT_FOUND,
      httpStatus: StatusCodes.UNAUTHORIZED,
      message: 'Please sign out and sign back in.',
      debugMessage: 'Request did not contain required security token.',
      where: `${__filename} authMiddleware`,
      report: false,
      requestId: context.header['x-request-id'] as string,
      retriable: false,
    });
  }
  if (accessToken !== process.env.GLOBAL_ACCESS_TOKEN) {
    try {
      const { payload: jwtPayload } = validateAndExtractJWTPayload(accessToken, requestId);

      // eslint-disable-next-line no-param-reassign
      context.state.userContext = await UserContextV2Utils.getUserContextForTokenPayload(jwtPayload, requestId);
    } catch (error) {
      logger.error({
        error,
        message: `Error in verifying signature & getting payload for security token.`,
      });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new ProcureError({
        errorCode: AuthenticationErrorCodeEnum.TOKEN_INVALID,
        httpStatus: StatusCodes.UNAUTHORIZED,
        message: 'Please sign out and sign back in.',
        debugMessage: 'Cannot verify the token provided.',
        where: `${__filename} preHandler hook`,
        report: false,
        requestId,
        retriable: false,
      });
    }
  }
  return next();
};
