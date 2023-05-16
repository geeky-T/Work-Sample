/* eslint-disable no-param-reassign */
import {
  DeliverNotificationPayloadInput,
  ExpandedOrderNotificationPayload,
  MailChimpEmailPayload,
  MailChimpHandlebarTemplateVariablePayload,
  OrderRequestNotificationPayload,
  ReturnNotificationPayloadInput,
} from '@custom-types/NotificationTypes/payloads';
import { BugReporterService, ResourceNotFoundError, logger } from '@procurenetworks/backend-utils';
import {
  ItemEntity,
  OrderRequestItemEntity,
  RoleEntity,
  StringObjectID,
  TenantEntity,
  UserContext,
  UserEntity,
  WorkspaceEntity,
} from '@procurenetworks/inter-service-contracts';
import assert from 'assert';
import { uniqBy } from 'lodash';
import chunk from 'lodash/chunk';
import { appConfigs } from '../../appConfigs';
import { MAIL_SUBJECTS } from '../../const/orderNotification';
import { OrderRequestItemVisibleStatusMapping } from '../../const/orderRequestItem';
import { ItemService, RoleService, TenantService, UserService } from '../../transport/__grpc/client/services';
import { contextUserUtil } from '../../utils/userAuthentication/contextUser.util';
import NetworkService from './helpers/NetworkServiceV2';

const {
  env: { EMAIL_SERVICE_BASE_URL: baseEmailServiceUrl },
} = process;

assert.ok(baseEmailServiceUrl, 'Missing Email Service Url in environment variables');

const sleep = async (time: number) => new Promise((resolve) => setTimeout(resolve, time));

class EmailServiceClass {
  private networkService: NetworkService;

  private basePath: string;

  constructor(baseUri: string, basePath: string) {
    this.networkService = new NetworkService(baseUri, 'EmailService', false);
    this.basePath = basePath;
  }

  private getRolesConfiguredForNotificationTemplate = async (
    templateSlug: WorkspaceEntity.AllowedPermissionsSubjectEnum,
    userContext: UserContext,
  ): Promise<RoleEntity.RoleSchema[]> => {
    const { roles } = await RoleService.getAllRoles(
      {
        filters: {
          types: [RoleEntity.RoleTypeEnum.CUSTOM, RoleEntity.RoleTypeEnum.SYSTEM, RoleEntity.RoleTypeEnum.HIDDEN],
        },
      },
      userContext,
    );

    return roles.filter((role) => {
      const permittedOnNotificationEntity = role.permittedOn.find(
        ({ entity }) => entity === WorkspaceEntity.AllowedPermissionsEntityEnum.NOTIFICATION,
      );
      if (permittedOnNotificationEntity?.permissions.some((permissionString) => permissionString.endsWith(templateSlug))) {
        return true;
      }
      return false;
    });
  };

  private getUsersOfRoleIds = async (
    roleIds: StringObjectID[],
    userContext: UserContext,
  ): Promise<UserEntity.UserSchema[]> => {
    const { users } = await UserService.getAllUsers({ filters: { roleIds } }, userContext);
    return users;
  };

  private getUsersOfOrder = async (
    emailPayload: ExpandedOrderNotificationPayload,
    userContext: UserContext,
  ): Promise<UserEntity.UserSchema[]> => {
    const userIds: StringObjectID[] = emailPayload.deliverToId
      ? [emailPayload.createdById, emailPayload.deliverToId]
      : [emailPayload.createdById];
    const { users } = await UserService.getUsersByIds({ filters: { userIds } }, userContext);
    return users;
  };

  private async getTenantByUserContext(userContext: UserContext): Promise<TenantEntity.TenantSchema | undefined> {
    const paginatedTenantsPayload = await TenantService.getPaginatedTenants(
      {
        filters: { tenantIds: [userContext.tenantId] },
        paginationProps: { limit: 1 },
        projection: { adminEmailId: true, name: true },
      },
      userContext,
    );
    if (paginatedTenantsPayload.edges && paginatedTenantsPayload.edges.length === 1) {
      return paginatedTenantsPayload.edges[0].node;
    }

    await BugReporterService.reportError(
      {
        error: new ResourceNotFoundError({
          message: `Cannot find tenant for tenantId: ${userContext.tenantId}`,
          where: `${__filename} - ${this.getTenantAdminEmailId.name}`,
        }),
      },
      {
        serviceName: appConfigs.node.service,
        functionName: this.getTenantAdminEmailId.name,
        currentUserInfo: userContext.currentUserInfo,
        requestId: userContext.requestId,
        tenantId: userContext.tenantId,
      },
    );
  }

  private getTenantAdminEmailId = async (userContext: UserContext, tenant?: TenantEntity.TenantSchema): Promise<string> => {
    if (tenant && tenant.adminEmailId) {
      return tenant.adminEmailId;
    }

    const paginatedTenantsPayload = await TenantService.getPaginatedTenants(
      {
        filters: { tenantIds: [userContext.tenantId] },
        paginationProps: { limit: 1 },
        projection: { adminEmailId: true },
      },
      userContext,
    );
    if (paginatedTenantsPayload.edges && paginatedTenantsPayload.edges.length === 1) {
      return paginatedTenantsPayload.edges[0].node.adminEmailId;
    }
    await BugReporterService.reportError(
      {
        error: new ResourceNotFoundError({
          message: `Cannot find tenant for tenantId: ${userContext.tenantId}`,
          where: `${__filename} - ${this.getTenantAdminEmailId.name}`,
        }),
      },
      {
        serviceName: appConfigs.node.service,
        functionName: this.getTenantAdminEmailId.name,
        currentUserInfo: userContext.currentUserInfo,
        requestId: userContext.requestId,
        tenantId: userContext.tenantId,
      },
    );
    return '';
  };

  private toTitleCase = (stringToConvert: string) => {
    return stringToConvert ? stringToConvert.charAt(0).toLocaleUpperCase() + stringToConvert.slice(1) : stringToConvert;
  };

  private transformToTemplateVariables = (
    notificationObject: OrderRequestNotificationPayload,
  ): MailChimpHandlebarTemplateVariablePayload[] => {
    const {
      firstName,
      notification: {
        _id,
        createdAt,
        requestor,
        departmentName,
        destinationSiteName,
        dueDate,
        deliveryAttachments,
        items,
        recipient,
        status,
        orderRequestCode,
        returnAttachments,
        partnerName,
      },
    } = notificationObject;
    const attachedTemplateVariableValues: MailChimpHandlebarTemplateVariablePayload[] = [
      {
        content: this.toTitleCase(firstName),
        name: 'first_name',
      },
      {
        content: partnerName && this.toTitleCase(partnerName),
        name: 'partner_name',
      },
      {
        content: new Date().toLocaleDateString('en-US'),
        name: 'date',
      },
      {
        content: orderRequestCode,
        name: 'order_id',
      },
      {
        content: status.toUpperCase(),
        name: 'status',
      },
      {
        content: destinationSiteName && this.toTitleCase(destinationSiteName),
        name: 'site_id',
      },
      {
        content: `${process.env.ORDER_REQUEST_UI_URL}/orders/history/${_id}`,
        name: 'urlVar',
      },
      {
        content: new Date(createdAt).toLocaleDateString('en-US'),
        name: 'order_date',
      },
      {
        content: new Date(dueDate).toLocaleDateString('en-US'),
        name: 'due_date',
      },
      {
        content:
          requestor?.firstName &&
          `${this.toTitleCase(requestor.firstName)} ${this.toTitleCase(requestor.lastName || '')}`.trim(),
        name: 'created_by',
      },
      {
        content:
          recipient?.firstName &&
          `${this.toTitleCase(recipient.firstName)} ${this.toTitleCase(recipient.lastName || '')}`.trim(),
        name: 'deliver_to',
      },
      {
        content: departmentName && this.toTitleCase(departmentName),
        name: 'department_id',
      },
      {
        content: `$${Number(items.reduce((result: number, item) => item.cost * item.quantity + result, 0)).toFixed(2)}`,
        name: 'total_cost',
      },
      {
        content: items.map((item) => {
          const description = item.title || item.sku || item.upcCode || item.website || item.description;
          const description_overview =
            description && description.length > 14 ? description.slice(0, 14).concat('...') : description;
          return {
            ...item,
            cost: `$${Number(item.cost * item.quantity).toFixed(2)}`,
            cost_each: `$${Number(item.cost).toFixed(2)}`,
            description: description && description.startsWith('www') ? `https://${description}` : description,
            description_overview,
            image_url: item.imageUrl,
            isWebsite: description ? description.startsWith('http') || description.startsWith('www') : false,
            status: OrderRequestItemVisibleStatusMapping[item.status],
          };
        }),
        name: 'items',
      },
    ];
    if (deliveryAttachments) {
      if (deliveryAttachments.verificationNote) {
        attachedTemplateVariableValues.push({
          content: deliveryAttachments.verificationNote,
          name: 'deliveryNote',
        });
      }
      if (deliveryAttachments.verificationImageUrl) {
        attachedTemplateVariableValues.push({
          content: deliveryAttachments.verificationImageUrl,
          name: 'deliveryImageUrl',
        });
      }
    }
    if (returnAttachments) {
      if (returnAttachments.containerId) {
        attachedTemplateVariableValues.push({
          content: returnAttachments.containerId,
          name: 'returnContainerId',
        });
      }
      if (returnAttachments.qrCodeImage) {
        attachedTemplateVariableValues.push({
          content: returnAttachments.qrCodeImage,
          name: 'returnContainerQRCode',
        });
      }
      if (returnAttachments.destinationSiteId) {
        attachedTemplateVariableValues.push({
          content: returnAttachments.destinationSiteName,
          name: 'returnDestinationSiteName',
        });
      }
    }
    return attachedTemplateVariableValues.filter((variable) => !!variable.content);
  };

  private createMailApiPayload = (
    notificationObjects: OrderRequestNotificationPayload[],
    templateName: keyof typeof MAIL_SUBJECTS,
    bounceMailAddress: string,
  ) => {
    return notificationObjects.map((notificationObject) => {
      // eslint-disable-next-line id-length
      const { emailId: to } = notificationObject;
      const payload = {
        bounce: bounceMailAddress,
        origin: 'orderRequest',
        subject: MAIL_SUBJECTS[templateName],
        templateName,
        templateVariables: this.transformToTemplateVariables(notificationObject),
        to,
      };
      return payload;
    });
  };

  private sendEmails = async (payloads: MailChimpEmailPayload[]) => {
    return this.networkService
      .post({
        body: payloads,
        path: `${this.basePath}/sendemail`,
      })
      .then((response) => {
        // eslint-disable-next-line no-console
        console.log('Email Response:', JSON.stringify(response, null, 2)); // TO DO: REMOVE LATER
        return response;
      });
  };

  private sendNotifications = async (payloads: MailChimpEmailPayload[]) => {
    const mailChunks = chunk(payloads, 10);
    for (const mailChunk of mailChunks) {
      await this.sendEmails(mailChunk);
      await sleep(1000);
    }
  };

  private filterApplicableRecipientUsers = (
    emailPayload: ExpandedOrderNotificationPayload,
    users: UserEntity.UserSchema[],
    applicableRoles: RoleEntity.RoleSchema[],
  ): UserEntity.UserSchema[] => {
    const filteredUsers = users.filter((user) => {
      for (const userScopedRole of user.scopedRoles) {
        if (
          userScopedRole.scopeEntity !== RoleEntity.AllowedScopeEntityEnum.SCOPELESS &&
          (!userScopedRole.scopeGroupIds || userScopedRole.scopeGroupIds.length === 0)
        ) {
          continue;
        }
        const correspondingRole = applicableRoles.find((role) => role._id.toString() === userScopedRole.roleId.toString());
        if (!correspondingRole) {
          continue;
        }
        if (correspondingRole.allowedScopes.some(({ scope }) => scope === RoleEntity.AllowedScopeEntityEnum.SITE)) {
          if (
            userScopedRole.scopeGroupIds?.includes(emailPayload.billToSiteId.toString()) ||
            userScopedRole.scopeGroupIds?.includes(emailPayload.destinationSiteId.toString())
          ) {
            return true;
          }
          continue;
        }
        return true;
      }
      return false;
    });
    return filteredUsers;
  };

  private createNotificationPayloadForRoleBasedRecipients = async (
    emailPayload: ExpandedOrderNotificationPayload,
    applicableRecipients: UserEntity.UserSchema[],
    applicableRoles: RoleEntity.RoleSchema[],
    userContext: UserContext,
    partnerName?: string,
  ): Promise<OrderRequestNotificationPayload[]> => {
    const notificationPayloads: OrderRequestNotificationPayload[] = [];
    let inventoryAssetItems: ItemEntity.ItemUnionType[] = [];
    const { items: orderRequestItems } = emailPayload;
    for (const user of applicableRecipients) {
      const notificationPayload: OrderRequestNotificationPayload = {
        ...user,
        name: user.name,
        notification: {
          ...emailPayload,
          partnerName,
          items: [],
        },
      };

      for (const userScopedRole of user.scopedRoles) {
        const correspondingRole = applicableRoles.find((role) => role._id.toString() === userScopedRole.roleId.toString());
        if (!correspondingRole) {
          logger.silly(`${userScopedRole.roleId} is not configured to receive mail.`);
          continue;
        }
        const permittedOnNotificationEntity = correspondingRole.permittedOn.find(
          (element) => element.entity === WorkspaceEntity.AllowedPermissionsEntityEnum.NOTIFICATION,
        );

        const actionsForNotificationTemplate = permittedOnNotificationEntity?.permissions.map(
          (permissionString) => permissionString.split('/')[0],
        );

        if (!actionsForNotificationTemplate) {
          continue;
        }
        let applicableOrderRequestItems = orderRequestItems;
        if (
          userScopedRole.scopeGroupIds?.length &&
          correspondingRole.allowedScopes.some(({ scope }) => RoleEntity.AllowedScopeEntityEnum.CATEGORY === scope)
        ) {
          if (inventoryAssetItems.length === 0) {
            const itemIds = orderRequestItems
              .map((orderRequestItem) => orderRequestItem.itemId)
              .filter((itemId) => !!itemId) as StringObjectID[];
            if (itemIds && itemIds.length) {
              const { items: itemDocuments } = await ItemService.getAllItems({ filters: { itemIds } }, userContext);
              inventoryAssetItems = itemDocuments;
            }
          }
          applicableOrderRequestItems = orderRequestItems.filter((orderRequestItem) => {
            if (!orderRequestItem.itemId) {
              return true;
            }
            const correspondingItem = inventoryAssetItems.find(
              ({ _id }) => orderRequestItem.itemId?.toString() === _id.toString(),
            );
            if (correspondingItem && userScopedRole.scopeGroupIds?.includes(correspondingItem.categoryId.toString())) {
              return true;
            }
            return false;
          });
        }
        for (const action of actionsForNotificationTemplate) {
          switch (action) {
            case WorkspaceEntity.AllowedPermissionActionsEnum.NO_SKU:
              notificationPayload.notification.items = [
                ...notificationPayload.notification.items,
                ...applicableOrderRequestItems.filter(
                  (item) => item.type === OrderRequestItemEntity.OrderRequestItemTypeEnum.NO_SKU,
                ),
              ];
              break;
            case WorkspaceEntity.AllowedPermissionActionsEnum.INVENTORY:
              notificationPayload.notification.items = [
                ...notificationPayload.notification.items,
                ...applicableOrderRequestItems.filter(
                  (item) => item.type === OrderRequestItemEntity.OrderRequestItemTypeEnum.INVENTORY,
                ),
              ];
              break;
            case WorkspaceEntity.AllowedPermissionActionsEnum.ASSET:
              notificationPayload.notification.items = [
                ...notificationPayload.notification.items,
                ...applicableOrderRequestItems.filter(
                  (item) => item.type === OrderRequestItemEntity.OrderRequestItemTypeEnum.ASSET,
                ),
              ];
              break;
          }
        }
      }
      if (notificationPayload.notification.items.length > 0) {
        notificationPayload.notification.items = uniqBy(notificationPayload.notification.items, (item) =>
          item._id.toString(),
        );
        notificationPayloads.push(notificationPayload);
      }
    }
    return notificationPayloads;
  };

  private createNotificationPayloadForUsersOfOrder = (
    emailPayload: ExpandedOrderNotificationPayload,
    applicableRecipients: UserEntity.UserSchema[],
    partnerName?: string,
  ): OrderRequestNotificationPayload[] => {
    const notificationPayloads: OrderRequestNotificationPayload[] = [];
    for (const user of applicableRecipients) {
      const notificationPayload: OrderRequestNotificationPayload = {
        ...user,
        name: user.name,
        notification: { ...emailPayload, partnerName },
      };
      if (notificationPayload.notification.items.length > 0) {
        notificationPayloads.push(notificationPayload);
      }
    }
    return notificationPayloads;
  };

  sendOrderRequestCancelledNotification = async (
    emailPayload: ExpandedOrderNotificationPayload,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_DELETED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );
      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (usersOfOrder.every(({ tenantId }) => tenantId.toString() === effectiveUserContext.tenantId.toString())) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({ message: 'No payload to send a delete order email. Skipping sending email' });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order deleted email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestCancelledNotification',
          },
        );
      }
    }
  };

  sendOrderRequestCreatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_CREATED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );
      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (usersOfOrder.every(({ tenantId }) => tenantId.toString() === effectiveUserContext.tenantId.toString())) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send a order request created email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order request created email.' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestCreatedNotification',
          },
        );
      }
    }
  };

  sendOrderRequestItemDeliveredNotification = async (
    emailPayload: DeliverNotificationPayloadInput,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_DELIVERED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );
      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (usersOfOrder.every(({ tenantId }) => tenantId.toString() === effectiveUserContext.tenantId.toString())) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send an order request item(s) delivered email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order request item delivered email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestItemDeliveredNotification',
          },
        );
      }
    }
  };

  sendOrderRequestItemReturnedNotification = async (
    emailPayload: ReturnNotificationPayloadInput,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_ITEMS_RETURNED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );

      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (usersOfOrder.every(({ tenantId }) => tenantId.toString() === effectiveUserContext.tenantId.toString())) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send an order request item returned email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order request item return email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestItemReturnedNotification',
          },
        );
      }
    }
  };

  sendOrderRequestReceivedNotification = async (
    emailPayload: ExpandedOrderNotificationPayload,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_RECEIVED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );

      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (!emailPayload.childTenantId) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send an order received email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error) {
      logger.error({ error, message: 'Error sending ORDER RECEIVED email notification:' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestReceivedNotification',
          },
        );
      }
    }
  };

  sendOrderRequestStatusUpdatedNotification = async (
    emailPayload: ExpandedOrderNotificationPayload,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_STATUS_UPDATED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );

      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (!emailPayload.childTenantId) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send an order status update email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error) {
      logger.error({ error, message: 'Error in sending order status update email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestStatusUpdatedNotification',
          },
        );
      }
    }
  };

  sendOrderRequestBackOrderedNotification = async (
    emailPayload: ExpandedOrderNotificationPayload,
    userContext: UserContext,
  ) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_UPDATED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [usersOfOrder, users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );

      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (!emailPayload.childTenantId) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder, ...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send a back ordered order email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order request updated email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestBackOrderedNotification',
          },
        );
      }
    }
  };

  sendOrderRequestUpdatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { ORDER_REQUEST_UPDATED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const [usersOfOrder, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfOrder(emailPayload, effectiveUserContext),
        this.getTenantAdminEmailId(userContext),
      ]);

      let notificationPayloadsForUsersOfOrder: OrderRequestNotificationPayload[] = [];
      if (!emailPayload.childTenantId) {
        notificationPayloadsForUsersOfOrder = this.createNotificationPayloadForUsersOfOrder(emailPayload, usersOfOrder);
      }

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForUsersOfOrder];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send an update order email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: any) {
      logger.error({ error, message: 'Error in sending order request updated email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendOrderRequestUpdatedNotification',
          },
        );
      }
    }
  };

  sendPickListCreatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
    try {
      const {
        AllowedPermissionsSubjectEnum: { PICK_LIST_CREATED: TEMPLATE_SLUG },
      } = WorkspaceEntity;
      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);
      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [users, tenantAdminEmailId] = await Promise.all([
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          userContext,
        ),
        this.getTenantAdminEmailId(userContext),
      ]);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
      );

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForRoleBasedRecipients];

      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send a pickList created email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: unknown) {
      logger.error({ error, message: 'Error in sending create pickList email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendPickListCreatedNotification',
          },
        );
      }
    }
  };

  sendOrderReadyForPickUpNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
    try {
      logger.info({
        message: 'Sending order ready for pickUp notification',
        payload: { emailPayload, tenantId: userContext.tenantId },
      });

      const {
        AllowedPermissionsSubjectEnum: { ORDER_READY_FOR_PICK_UP: TEMPLATE_SLUG },
      } = WorkspaceEntity;

      const effectiveUserContext = contextUserUtil.switchTenantForInternalUsage(userContext, emailPayload.tenantId);

      /** Create notification payload for each user. */
      const rolesConfigured = await this.getRolesConfiguredForNotificationTemplate(TEMPLATE_SLUG, effectiveUserContext);
      const [
        users,
        tenant,
        {
          users: [childTenantOrderRequestCreatedByUser],
        },
      ] = await Promise.all([
        this.getUsersOfRoleIds(
          rolesConfigured.map((role) => role._id),
          effectiveUserContext,
        ),
        this.getTenantByUserContext(userContext),
        UserService.getUsersByIds({ filters: { userIds: [emailPayload.createdById] } }, effectiveUserContext),
      ]);

      // this is not any await call
      const tenantAdminEmailId = await this.getTenantAdminEmailId(effectiveUserContext, tenant);

      /** Filter applicable recipient. */
      const filteredUsers = this.filterApplicableRecipientUsers(emailPayload, users, rolesConfigured);

      /** Creating limited payload. */
      const notificationPayloadsForRoleBasedRecipients = await this.createNotificationPayloadForRoleBasedRecipients(
        emailPayload,
        filteredUsers,
        rolesConfigured,
        userContext,
        tenant?.name,
      );

      let notificationPayloadsForCreatedOrderRequest: OrderRequestNotificationPayload[] = [];

      notificationPayloadsForCreatedOrderRequest = this.createNotificationPayloadForUsersOfOrder(
        emailPayload,
        [childTenantOrderRequestCreatedByUser],
        tenant?.name,
      );

      /** Creating complete payload. */
      const notificationPayloads = [...notificationPayloadsForRoleBasedRecipients];
      notificationPayloads.push(...notificationPayloadsForCreatedOrderRequest);
      if (notificationPayloads.length === 0) {
        logger.warn({
          message: 'No payload to send a pickList created email. Skipping sending email',
        });
        logger.debug({ emailPayload, message: 'Input to the function call' });
        return;
      }
      /** Transform the notification payload to template variable and send the email.  */
      const payload = this.createMailApiPayload(notificationPayloads, TEMPLATE_SLUG, tenantAdminEmailId);
      await this.sendNotifications(payload);
    } catch (error: unknown) {
      logger.error({ error, message: 'Error in sending create pickList email' });
      if (error instanceof Error) {
        await BugReporterService.reportError(
          { error, event: { emailPayload } },
          {
            ...userContext,
            functionName: 'sendPickListCreatedNotification',
          },
        );
      }
    }
  };
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const basePath = isDevelopment ? '/development' : '/production';

export const EmailService = new EmailServiceClass(baseEmailServiceUrl, basePath);
