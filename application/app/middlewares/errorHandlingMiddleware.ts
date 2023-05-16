/* eslint-disable no-param-reassign */
import { BugReporterService, ProcureError } from '@procurenetworks/backend-utils';
import assert from 'assert';
import { DefaultContext, DefaultState, Next, ParameterizedContext } from 'koa';
import { appConfigs } from '../../appConfigs';

const {
  env: { ORDER_REQUEST_UI_URL, BASE_UI_DOMAIN },
} = process;

assert.ok(ORDER_REQUEST_UI_URL, 'Missing ORDER_REQUEST_UI_URL in .env');
assert.ok(BASE_UI_DOMAIN, 'Missing BASE_UI_DOMAIN in .env');

export async function errorHandlingMiddleware(
  context: ParameterizedContext<DefaultState, DefaultContext>,
  next: Next,
): Promise<void> {
  try {
    await next();
  } catch (error) {
    if (error instanceof ProcureError) {
      context.status = error.httpStatus;
      context.body = {
        message: `${error.message}`,
        extensions: error.extensions,
      };
      if (error.httpStatus === 401) {
        context.body = {
          ...(context.body as object),
          redirect: true,
          redirectionUrl: `${BASE_UI_DOMAIN}/logout/?continueUrl=${ORDER_REQUEST_UI_URL}`,
        };
      }
    } else {
      context.status = 500;
    }
    if (!(error instanceof ProcureError && error.report === false)) {
      await BugReporterService.reportServerException(error, context.request, {
        serviceName: appConfigs.node.service,
        currentUserInfo: context.state.userContext?.currentUserInfo,
        requestId: context.state.userContext?.requestId,
        tenantId: context.state.userContext?.tenantId,
      });
    }
  }
}
