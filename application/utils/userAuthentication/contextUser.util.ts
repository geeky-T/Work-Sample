import { ErrorCodeEnum, ProcureError, StatusCodes } from '@procurenetworks/backend-utils';
import {
  CurrentUserInfo,
  RoleEntity,
  StringObjectID,
  UserContext,
  UserEntity,
} from '@procurenetworks/inter-service-contracts';
import mongoose from 'mongoose';
import { appConfigs } from '../../appConfigs';

class ContextUserUtil {
  getContextUser({ functionName }: { functionName: string; }, userContext: UserContext): CurrentUserInfo {
    const { currentUserInfo } = userContext;

    if (!currentUserInfo) {
      throw new ProcureError({
        errorCode: ErrorCodeEnum.FORBIDDEN_ERROR,
        httpStatus: StatusCodes.FORBIDDEN,
        message: `User not found`,
        where: `${functionName}`,
      });
    }

    return currentUserInfo;
  }

  getContextUserId({ functionName }: { functionName: string; }, userContext: UserContext): string {
    const currentUser = this.getContextUser({ functionName }, userContext);

    const { _id: currentUserId } = currentUser;
    if (!currentUserId) {
      throw new ProcureError({
        errorCode: ErrorCodeEnum.FORBIDDEN_ERROR,
        httpStatus: StatusCodes.FORBIDDEN,
        message: `userId not found`,
        where: `${functionName}`,
      });
    }

    return currentUserId.toString();
  }

  switchTenantForInternalUsage(userContext: UserContext, tenantId: StringObjectID): UserContext {
    return {
      ...userContext,
      tenantId,
    };
  }

  createSystemUserContext(): UserContext {
    const currentUserInfo: CurrentUserInfo = {
      _id: appConfigs.common.systemUserId,
      email: 'system.admin@something.com',
      firstName: 'System',
      lastName: 'User',
      status: UserEntity.UserStatusEnum.SYSTEM,
      scopedRoles: [
        {
          roleId: new mongoose.Types.ObjectId('6296793b128e17fcc4415725'),
          scopeEntity: RoleEntity.AllowedScopeEntityEnum.SCOPELESS,
          scopeGroupIds: [],
        },
      ],
      timezone: 'America/Phoenix',
    };

    const timestamp = new Date().toISOString();

    return {
      requestTimestamp: timestamp,
      tenantId: appConfigs.common.defaultTenantId,
      requestId: `${appConfigs.node.service} - ${timestamp}`,
      currentUserInfo,
    };
  }

  createSystemUserContextForTenantId(tenantId: string): UserContext {
    return {
      requestTimestamp: new Date().toISOString(),
      tenantId,
      requestId: 'req-1',
      currentUserInfo: {
        _id: appConfigs.common.systemUserId,
        email: 'system.admin@something.com',
        firstName: 'System',
        lastName: 'User',
        status: UserEntity.UserStatusEnum.SYSTEM,
        scopedRoles: [
          {
            roleId: new mongoose.Types.ObjectId('6296793b128e17fcc4415725'),
            scopeEntity: RoleEntity.AllowedScopeEntityEnum.SCOPELESS,
            scopeGroupIds: [],
          },
        ],
        timezone: 'America/Phoenix',
      },
    };
  }
}

export const contextUserUtil = new ContextUserUtil();
