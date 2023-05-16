import { StringObjectID } from '@procurenetworks/inter-service-contracts';

export type ValidateSessionResponseType = {
  iss: string;
  iat: number;
  exp: number;
  nbf: number;
  jti: string;
  email: string;
  sub: string;
  user_id: number;
  tenant_id: number;
  tenant_code: string;
  tenant_name: string;
  permissions: Array<string>;
  role_id: string;
  role_name: string;
  site_id: number;
  is_email_confirmation_pending: boolean;
  new_email: string | null;
  user_metadata: {
    first_name: string;
    last_name: string;
    user_id: number;
    photo_url: string | null;
    is_active: number;
  };
  user_private_key: string;
  tenants?: Array<{ id: number; name: string }>;
  user_time_zone: string | null;
};

export type MinimalUserResponseType = { id: StringObjectID; name: string };

export type CoreUserResponseType = {
  id: StringObjectID;
  firstName: string;
  lastName: string;
  fullName: string;
  name: string;
  email: string;
  isActive: boolean;
};
