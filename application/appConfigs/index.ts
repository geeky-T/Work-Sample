/* eslint-disable prefer-destructuring */
import { BaseConfigs, ResourceNotFoundError, UndefinedError } from '@procurenetworks/backend-utils';
import { AWSConfigs } from './aws/aws.config';

class AppConfigs extends BaseConfigs {
  get jwtAuthSecret(): string {
    const authSecret = process.env.AUTH_JWT_TOKEN;

    if (!authSecret) {
      throw new ResourceNotFoundError({
        message: `auth jwt token not found`,
        where: `AppConfigs.jwtAuthSecret`,
      });
    }

    return authSecret;
  }

  get aws(): AWSConfigs {
    return AWSConfigs.getInstance();
  }

  get creatorRoleId(): string {
    if (!process.env.CREATOR_ROLE_ID) {
      throw new UndefinedError({
        debugMessage: `CREATOR_ROLE_ID env variable not found/defined`,
        where: `${__filename} : ${new Error().stack}`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      });
    }
    return process.env.CREATOR_ROLE_ID;
  }

  get superAdminRoleId(): string {
    if (!process.env.SUPER_ADMIN_ROLE_ID) {
      throw new UndefinedError({
        message: `Super Admin role id not provided`,
        where: `AppConfigs.superAdminRoleId`,
      });
    }

    return process.env.SUPER_ADMIN_ROLE_ID;
  }
}

export const appConfigs = new AppConfigs();
