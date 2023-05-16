// @flow
import { UserContext } from '@procurenetworks/inter-service-contracts';

export type CustomContextState = {
  userContext: UserContext;
};

export type UnparsedQueryParameters = {
  limit?: string;
  sortBy?: string;
  skip?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
};

export type GetBinsQueryParameters = UnparsedQueryParameters & {
  siteId?: number;
};
