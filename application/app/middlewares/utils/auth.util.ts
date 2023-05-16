import { DefaultContext, DefaultState, ParameterizedContext } from 'koa';

const whitelistedRoutesWithoutAccessToken: string[] = [];

const whitelistedRouteRegexWithoutAccessToken: RegExp[] = [];

export const byPassTokenVerification = (url?: string): boolean => {
  if (url && whitelistedRoutesWithoutAccessToken.includes(url)) {
    return true;
  }

  if (url && whitelistedRouteRegexWithoutAccessToken.some((regex) => regex.test(url))) {
    return true;
  }

  return false;
};

export const extractAuthToken = (context: ParameterizedContext<DefaultState, DefaultContext, any>): string | undefined => {
  const {
    request: { headers, query },
  } = context;
  const { cookies } = context;
  if (query.accessToken) {
    return query.accessToken as string | undefined;
  }
  if (
    headers.authorization &&
    headers.authorization.split(' ')[0] === 'Bearer' &&
    headers.authorization.split(' ')[1] !== 'undefined'
  ) {
    return headers.authorization.split(' ')[1];
  }
  if (headers.accesstoken && headers.accesstoken) {
    return headers.accesstoken as string | undefined;
  }
  if (cookies.get('accessToken')) {
    return cookies.get('accessToken');
  }
  return undefined;
};
