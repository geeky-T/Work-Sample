import {
  AuthenticationErrorCodeEnum,
  ForbiddenError,
  InternalServerError,
  logger,
  ProcureError,
  StatusCodes,
} from '@procurenetworks/backend-utils';
import {
  CurrentUserInfo,
  RoleEntity,
  StringObjectID,
  TokenPayload,
  TokenUsageEnum,
  UserContext,
  UserEntity,
} from '@procurenetworks/inter-service-contracts';
import { appConfigs } from '../../appConfigs';
import { UserService } from '../../transport/__grpc/client/services';

export function createUnAuthUserContext(tenantId: StringObjectID, requestId: string): UserContext {
  return {
    requestTimestamp: new Date().toISOString(),
    tenantId,
    requestId,
    currentUserInfo: {
      email: 'developer@something.com',
      firstName: 'CompanyName',
      status: UserEntity.UserStatusEnum.ACTIVE,
      lastName: 'Admin',
      scopedRoles: [
        {
          roleId: appConfigs.superAdminRoleId,
          scopeEntity: RoleEntity.AllowedScopeEntityEnum.SCOPELESS,
          scopeGroupIds: [],
        },
      ],
      _id: '',
    },
  };
}

export class UserContextV2Utils {
  static createJWTPayloadForGlobalAccessToken(): TokenPayload {
    return {
      emailId: 'developer@something.com',
      tenantId: appConfigs.common.defaultTenantId,
      tokenUse: TokenUsageEnum.ACCESS,
      userId: appConfigs.common.developerUserId,
    };
  }

  static async getUserContextForTokenPayload(userTokenPayload: TokenPayload, requestId: string): Promise<UserContext> {
    try {
      const { userId, tenantId: tenantIdFromToken } = userTokenPayload;
      const unAuthUserContext = createUnAuthUserContext(tenantIdFromToken, requestId);

      const {
        users: [user],
      } = await UserService.getUsersByIds({ filters: { userIds: [userId] } }, unAuthUserContext);

      if (!user) {
        throw new ForbiddenError({
          debugMessage: 'User not found for the userId inside the JWT payload.',
          errorCode: AuthenticationErrorCodeEnum.UNAUTHORIZED,
          httpStatus: StatusCodes.UNAUTHORIZED,
          message: 'Please sign out and sign back in.',
          report: false,
          where: `${__filename} ${this.getUserContextForTokenPayload.name}`,
        });
      } else if ([UserEntity.UserStatusEnum.DELETED, UserEntity.UserStatusEnum.INACTIVE].includes(user.status)) {
        throw new ForbiddenError({
          errorCode: AuthenticationErrorCodeEnum.DELETED_USER,
          httpStatus: StatusCodes.UNAUTHORIZED,
          debugMessage: `User is deleted.`,
          message: 'Your account is deactivated. Please contact your administrator.',
          params: { user },
          report: false,
          where: `${__filename} - ${this.getUserContextForTokenPayload.name}`,
        });
      }

      const isSuperAdmin = user.scopedRoles.some(({ roleId }) => appConfigs.superAdminRoleId === roleId.toString());

      if (!isSuperAdmin && tenantIdFromToken !== user.tenantId.toString()) {
        throw new ForbiddenError({
          debugMessage: 'User is not authorized to access other tenants.',
          errorCode: AuthenticationErrorCodeEnum.UNAUTHORIZED,
          httpStatus: StatusCodes.UNAUTHORIZED,
          message: 'Please sign out and sign back in.',
          report: false,
          where: `${__filename} ${this.getUserContextForTokenPayload.name}`,
        });
      }

      const { emailId, _id, firstName, lastName, scopedRoles, status, userTimeZone } = user;
      const currentUserInfo: CurrentUserInfo = {
        email: emailId,
        firstName,
        lastName,
        scopedRoles,
        status,
        _id,
        timezone: userTimeZone,
      };
      return {
        currentUserInfo,
        requestTimestamp: new Date().toISOString(),
        tenantId: tenantIdFromToken,
        requestId,
      };
    } catch (error: any) {
      logger.error({ error, message: `Error inside getUserContextForTokenPayload` });
      if (error instanceof ProcureError) {
        throw error;
      }
      throw new InternalServerError({
        debugMessage: `Failed to getUserContextForTokenPayload - ${error.message}`,
        error,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
        params: { userTokenPayload },
        where: `${__filename} - ${this.getUserContextForTokenPayload.name}`,
      });
    }
  }
}
