// /* eslint-disable no-param-reassign */
// import { CategorizedUsersBasedOnPermissionInput } from '@custom-types/NotificationTypes/inputs';
// import {
//   DeliverNotificationPayloadInput,
//   ExpandedOrderNotificationPayload,
//   MailChimpEmailPayload,
//   MailChimpHandlebarTemplateVariablePayload,
//   OrderRequestNotificationPayload,
//   ReturnNotificationPayloadInput,
// } from '@custom-types/NotificationTypes/payloads';
// import { AsyncLocalStorage, BugReporterService, logger } from '@procurenetworks/backend-utils';
// import {
//   OrderRequestEntity,
//   OrderRequestItemEntity,
//   StringObjectID,
//   UserContext,
// } from '@procurenetworks/inter-service-contracts';
// import assert from 'assert';
// import { Dictionary } from 'lodash';
// import chunk from 'lodash/chunk';
// import groupBy from 'lodash/groupBy';
// import uniqBy from 'lodash/uniqBy';
// import { MailChimpTemplateNameEnum, MAIL_SUBJECTS } from '../../const/orderNotification';
// import { OrderRequestItemVisibleStatusMapping } from '../../const/orderRequestItem';
// import { CoreUserResponseType } from '../../types/CoreTypes/response';
// import CoreService from './CoreService';
// import NetworkService from './helpers/NetworkServiceV2';
// import InventoryService from './InventoryService';

// const {
//   env: { AUTH_COOKIE_NAME: authCookieName },
// } = process;

// const {
//   env: { EMAIL_SERVICE_BASE_URL: baseEmailServiceUrl },
// } = process;

// assert.ok(baseEmailServiceUrl, 'Missing Email Service Url in environment variables');
// assert.ok(authCookieName, 'Auth Cookie Name in environment variables');

// const { OrderRequestItemTypeEnum } = OrderRequestItemEntity;

// const sleep = async (time: number) => new Promise((resolve) => setTimeout(resolve, time));

// class EmailServiceClass {
//   #_networkService;

//   #_basePath;

//   constructor(baseUri: string, basePath: string) {
//     this.#_networkService = new NetworkService(baseUri, 'EmailService', false);
//     this.#_basePath = basePath;
//   }

//   setupHeaders({ headers = {}, params: parameters = {} }) {
//     if (!headers) {
//       const token = AsyncLocalStorage.get('authToken');
//       // eslint-disable-next-line no-param-reassign
//       headers = { cookie: `${[authCookieName]}=${token}` };
//     }
//     this.#_networkService.setDefaultHeaders(headers);
//     this.#_networkService.setDefaultParams(parameters);
//   }

//   #_getOrderRequestor = async (order: OrderRequestEntity.OrderRequestSchema, userContext: UserContext) => {
//     const [user] = await CoreService.getUsers([order.createdById], userContext);
//     return user;
//   };

//   #_getOrderDeliverToPerson = async (deliverToId: StringObjectID, userContext: UserContext) => {
//     return CoreService.getUsers([deliverToId], userContext).then((response) => response[0]);
//   };

//   #_getSiteManagers = async (order: OrderRequestEntity.OrderRequestSchema) => {
//     const { billToSiteId } = order;
//     logger.info({
//       billToSiteId,
//       message: '\tEMAIL SERVICE: Fetching site managers by billToSiteId:',
//     }); // TO DO: REMOVE LATER
//     const siteManagersObject = await InventoryService.getSiteManagersBySiteId(billToSiteId);
//     const siteManagers = Object.keys(siteManagersObject).map((userId) => siteManagersObject[userId]);
//     return siteManagers;
//   };

//   #_getInventoryManagers = async () => {
//     logger.info({ message: '\tEMAIL SERVICE: Fetching inventory managers' }); // TO DO: REMOVE LATER
//     const inventoryManagers = await CoreService.getInventoryManagers();
//     return inventoryManagers;
//   };

//   #_getAssetManagers = async () => {
//     logger.info({ message: '\tEMAIL SERVICE: Fetching asset managers' }); // TO DO: REMOVE LATER
//     const assetManagers = CoreService.getAssetManagers();
//     return assetManagers;
//   };

//   #_getTenantAdminEmailAddress = async ({ tenantId }: UserContext) => {
//     const tenantAdmins = await CoreService.getTenantAdmin(tenantId);
//     return tenantAdmins;
//   };

//   #_getNoSKUBuyers = async () => {
//     const noSkuBuyers = await CoreService.getBuyers();
//     return noSkuBuyers;
//   };

//   #_initializeOrderNotificationObjects = (
//     users: Array<CoreUserResponseType>,
//     order: OrderRequestEntity.OrderRequestSchema,
//   ): OrderRequestNotificationPayload[] => {
//     const allUniqUsers = uniqBy(users, 'id');

//     const notificationObjects = allUniqUsers.map((user) => ({
//       ...user,
//       notification: {
//         ...order,
//         items: [],
//       },
//     }));
//     return notificationObjects;
//   };

//   #_getSiteManagersByPermission = async (hasInventoryItems: boolean, hasAssetItems: boolean, hasNoSkuItems: boolean) => {
//     // Fetches site manager with "no sku" request notification only if such items are present in the order;
//     const siteManagersWithNoSKURequestPromise = hasNoSkuItems
//       ? CoreService.getSiteManagersWithNoSKUPermission()
//       : Promise.resolve([]);

//     // Fetches site manager with "inventory" request notification only if such items are present in the order;
//     const siteManagersWithInventoryRequestPromise = hasInventoryItems
//       ? CoreService.getSiteManagersWithInventoryPermission()
//       : Promise.resolve([]);

//     // Fetches site manager with "asset" request notification only if such items are present in the order;
//     const siteManagersWithAssetRequestPromise = hasAssetItems
//       ? CoreService.getSiteManagersWithAssetPermission()
//       : Promise.resolve([]);

//     return Promise.all([
//       siteManagersWithInventoryRequestPromise,
//       siteManagersWithAssetRequestPromise,
//       siteManagersWithNoSKURequestPromise,
//     ]);
//   };

//   #_getItemNotificationPermissionVerifier = (
//     siteManagersWithInventoryPermission: CoreUserResponseType[],
//     siteManagersWithAssetPermission: CoreUserResponseType[],
//     siteManagersWithNoSKUPermission: CoreUserResponseType[],
//     inventoryManagers: CoreUserResponseType[],
//     assetManagers: CoreUserResponseType[],
//     noSKUBuyers: CoreUserResponseType[],
//   ) => {
//     return (userId: StringObjectID, itemType: string) => {
//       switch (itemType) {
//         case OrderRequestItemTypeEnum.INVENTORY: {
//           const result =
//             !!siteManagersWithInventoryPermission.find((siteManager) => siteManager.id.toString() === userId.toString()) ||
//             !!inventoryManagers.find((invManager) => invManager.id === userId.toString());
//           return result;
//         }
//         case OrderRequestItemTypeEnum.ASSET: {
//           const result =
//             !!siteManagersWithAssetPermission.find((siteManager) => siteManager.id.toString() === userId.toString()) ||
//             !!assetManagers.find((assetManager) => assetManager.id === userId.toString());
//           return result;
//         }
//         case OrderRequestItemTypeEnum.NO_SKU: {
//           const result =
//             !!siteManagersWithNoSKUPermission.find((siteManager) => siteManager.id.toString() === userId.toString()) ||
//             !!noSKUBuyers.find((buyer) => buyer.id === userId.toString());
//           return result;
//         }
//         default:
//           return false;
//       }
//     };
//   };

//   #_attachItemsToUserNotificationObjectsBasedOnPermissions = async (
//     { assetManagers = [], inventoryManagers = [], noSkuBuyers = [] }: CategorizedUsersBasedOnPermissionInput,
//     categorizedOrderItems: Dictionary<
//       [OrderRequestItemEntity.ExpandedOrderRequestItemType, ...OrderRequestItemEntity.ExpandedOrderRequestItemType[]]
//     >,
//     notificationObjects: OrderRequestNotificationPayload[],
//   ) => {
//     const hasInventoryItems = !!categorizedOrderItems[OrderRequestItemTypeEnum.INVENTORY];
//     const hasAssetItems = !!categorizedOrderItems[OrderRequestItemTypeEnum.ASSET];
//     const hasNoSkuItems = !!categorizedOrderItems[OrderRequestItemTypeEnum.NO_SKU];
//     const [siteManagersWithInventoryPermission, siteManagersWithAssetPermission, siteManagersWithNoSKUPermission] =
//       await this.#_getSiteManagersByPermission(hasInventoryItems, hasAssetItems, hasNoSkuItems);

//     const itemNotificationPermissionVerifier = this.#_getItemNotificationPermissionVerifier(
//       siteManagersWithInventoryPermission,
//       siteManagersWithAssetPermission,
//       siteManagersWithNoSKUPermission,
//       inventoryManagers,
//       assetManagers,
//       noSkuBuyers,
//     );

//     return notificationObjects.reduce(
//       (result: OrderRequestNotificationPayload[], userNotification: OrderRequestNotificationPayload) => {
//         // Adds INVENTORY items are present in order and manager has its notification permission
//         if (
//           hasInventoryItems &&
//           itemNotificationPermissionVerifier(userNotification.id, OrderRequestItemTypeEnum.INVENTORY)
//         ) {
//           userNotification.notification.items = [
//             ...userNotification.notification.items,
//             ...categorizedOrderItems[OrderRequestItemTypeEnum.INVENTORY],
//           ];
//         }

//         // Adds ASSET items are present in order and manager has its notification permission
//         if (hasAssetItems && itemNotificationPermissionVerifier(userNotification.id, OrderRequestItemTypeEnum.ASSET)) {
//           userNotification.notification.items = [
//             ...userNotification.notification.items,
//             ...categorizedOrderItems[OrderRequestItemTypeEnum.ASSET],
//           ];
//         }

//         // Adds NO SKU items are present in order and manager has its notification permission
//         if (hasNoSkuItems && itemNotificationPermissionVerifier(userNotification.id, OrderRequestItemTypeEnum.NO_SKU)) {
//           userNotification.notification.items = [
//             ...userNotification.notification.items,
//             ...categorizedOrderItems[OrderRequestItemTypeEnum.NO_SKU],
//           ];
//         }
//         // Remove User Notification Object if no item to notify about.
//         if (!userNotification.notification.items || userNotification.notification.items.length === 0) {
//           return result;
//         }
//         return [...result, userNotification];
//       },
//       [],
//     );
//   };

//   #_toTitleCase = (stringToConvert: string) => {
//     return stringToConvert ? stringToConvert.charAt(0).toLocaleUpperCase() + stringToConvert.slice(1) : stringToConvert;
//   };

//   #_transformOrderToTemplateVariables = (
//     notificationObject: OrderRequestNotificationPayload,
//   ): MailChimpHandlebarTemplateVariablePayload[] => {
//     const {
//       firstName,
//       notification: {
//         _id,
//         createdAt,
//         requestor,
//         departmentName,
//         destinationSiteName,
//         dueDate,
//         deliveryAttachments,
//         items,
//         recipient,
//         status,
//         orderRequestCode,
//         returnAttachments,
//       },
//     } = notificationObject;
//     const attachedTemplateVariableValues: MailChimpHandlebarTemplateVariablePayload[] = [
//       {
//         content: this.#_toTitleCase(firstName),
//         name: 'first_name',
//       },
//       {
//         content: new Date().toLocaleDateString('en-CA'),
//         name: 'date',
//       },
//       {
//         content: orderRequestCode,
//         name: 'order_id',
//       },
//       {
//         content: status.toUpperCase(),
//         name: 'status',
//       },
//       {
//         content: destinationSiteName && this.#_toTitleCase(destinationSiteName),
//         name: 'site_id',
//       },
//       {
//         content: `${process.env.ORDER_REQUEST_UI_URL}/orders/history/${_id}`,
//         name: 'urlVar',
//       },
//       {
//         content: new Date(createdAt).toLocaleDateString('en-CA'),
//         name: 'order_date',
//       },
//       {
//         content: new Date(dueDate).toLocaleDateString('en-CA'),
//         name: 'due_date',
//       },
//       {
//         content:
//           requestor?.firstName &&
//           `${this.#_toTitleCase(requestor.firstName)} ${this.#_toTitleCase(requestor.lastName || '')}`.trim(),
//         name: 'created_by',
//       },
//       {
//         content:
//           recipient?.firstName &&
//           `${this.#_toTitleCase(recipient.firstName)} ${this.#_toTitleCase(recipient.lastName || '')}`.trim(),
//         name: 'deliver_to',
//       },
//       {
//         content: departmentName && this.#_toTitleCase(departmentName),
//         name: 'department_id',
//       },
//       {
//         content: `$${Number(items.reduce((result: number, item) => item.cost * item.quantity + result, 0)).toFixed(2)}`,
//         name: 'total_cost',
//       },
//       {
//         content: items.map((item) => {
//           const description = item.title || item.sku || item.upcCode || item.website || item.description;
//           const description_overview =
//             description && description.length > 14 ? description.slice(0, 14).concat('...') : description;
//           return {
//             ...item,
//             cost: `$${Number(item.cost * item.quantity).toFixed(2)}`,
//             cost_each: `$${Number(item.cost).toFixed(2)}`,
//             description: description && description.startsWith('www') ? `https://${description}` : description,
//             description_overview,
//             image_url: item.imageUrl,
//             isWebsite: description ? description.startsWith('http') || description.startsWith('www') : false,
//             status: OrderRequestItemVisibleStatusMapping[item.status],
//           };
//         }),
//         name: 'items',
//       },
//     ];
//     if (deliveryAttachments) {
//       if (deliveryAttachments.verificationNote) {
//         attachedTemplateVariableValues.push({
//           content: deliveryAttachments.verificationNote,
//           name: 'deliveryNote',
//         });
//       }
//       if (deliveryAttachments.verificationImageUrl) {
//         attachedTemplateVariableValues.push({
//           content: deliveryAttachments.verificationImageUrl,
//           name: 'deliveryImageUrl',
//         });
//       }
//     }
//     if (returnAttachments) {
//       if (returnAttachments.containerId) {
//         attachedTemplateVariableValues.push({
//           content: returnAttachments.containerId,
//           name: 'returnContainerId',
//         });
//       }
//       if (returnAttachments.qrCodeImage) {
//         attachedTemplateVariableValues.push({
//           content: returnAttachments.qrCodeImage,
//           name: 'returnContainerQRCode',
//         });
//       }
//       if (returnAttachments.destinationSiteId) {
//         attachedTemplateVariableValues.push({
//           content: returnAttachments.destinationSiteName,
//           name: 'returnDestinationSiteName',
//         });
//       }
//     }
//     return attachedTemplateVariableValues.filter((variable) => !!variable.content);
//   };

//   // #_transformItemToTemplateVariables = (notificationObject) => {
//   //   const {
//   //     first_name,
//   //     notification: { status, order_request_id },
//   //   } = notificationObject;
//   //   return [
//   //     {
//   //       content: this.#_toTitleCase(first_name),
//   //       name: 'first_name',
//   //     },
//   //     {
//   //       content: `${process.env.ORDER_UI_URL}/orders/history/${order_request_id}`,
//   //       name: 'urlVar',
//   //     },
//   //     {
//   //       content: ORDER_ITEM_VISIBLE_STATUS[status].toUpperCase(),
//   //       name: 'status',
//   //     },
//   //   ];
//   // };

//   #_transformToTemplateVariables = (notificationObject: OrderRequestNotificationPayload) => {
//     // if (
//     //   [
//     //     OrderRequestItemTypeEnum.INVENTORY,
//     //     OrderRequestItemTypeEnum.ASSET,
//     //     OrderRequestItemTypeEnum.NO_SKU,
//     //   ].includes(notificationObject.notification.type)
//     // ) {
//     //   return this.#_transformItemToTemplateVariables(notificationObject);
//     // }
//     return this.#_transformOrderToTemplateVariables(notificationObject);
//   };

//   #_createMailApiPayload = (
//     notificationObjects: OrderRequestNotificationPayload[],
//     templateName: MailChimpTemplateNameEnum,
//     bounceMailAddress: string,
//   ) => {
//     return notificationObjects.map((notificationObject) => {
//       // eslint-disable-next-line id-length
//       const { email: to } = notificationObject;
//       const payload = {
//         bounce: bounceMailAddress,
//         origin: 'or',
//         subject: MAIL_SUBJECTS[templateName],
//         templateName,
//         templateVariables: this.#_transformToTemplateVariables(notificationObject),
//         to,
//       };
//       return payload;
//     });
//   };

//   #_sendEmails = async (payloads: MailChimpEmailPayload[]) => {
//     return this.#_networkService
//       .post({
//         body: payloads,
//         path: `${this.#_basePath}/sendemail`,
//       })
//       .then((response) => {
//         // eslint-disable-next-line no-console
//         console.log('Email Response:', JSON.stringify(response, null, 2)); // TO DO: REMOVE LATER
//         return response;
//       });
//   };

//   #_sendNotifications = async (payloads: MailChimpEmailPayload[]) => {
//     const mailChunks = chunk(payloads, 10);
//     for (const mailChunk of mailChunks) {
//       await this.#_sendEmails(mailChunk);
//       await sleep(1000);
//     }
//   };

//   sendOrderRequestCancelledNotification = async (
//     emailPayload: ExpandedOrderNotificationPayload,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       // const siteManagersPromise = this.#_getSiteManagers(order);
//       const orderRequestorPromise = this.#_getOrderRequestor(order, userContext);
//       const inventoryManagersPromise = this.#_getInventoryManagers();
//       const assetManagersPromise = this.#_getAssetManagers();
//       const noSkuBuyersPromise = this.#_getNoSKUBuyers();

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);

//       const [
//         tenantAdminEmailAddress,
//         // siteManagers,
//         inventoryManagers,
//         assetManagers,
//         noSkuBuyers,
//         orderRequestor,
//       ] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         // siteManagersPromise,
//         inventoryManagersPromise,
//         assetManagersPromise,
//         noSkuBuyersPromise,
//         orderRequestorPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects(
//         [
//           // ...siteManagers,
//           ...inventoryManagers,
//           ...assetManagers,
//           ...noSkuBuyers,
//         ],
//         order,
//       );

//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           assetManagers,
//           inventoryManagers,
//           noSkuBuyers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );

//       /* Sends mail to deliver to person if requestor and deliver to person are not the same. */
//       if (order.deliverToId && order.createdById !== order.deliverToId) {
//         const orderDeliverToPerson = await this.#_getOrderDeliverToPerson(order.deliverToId, userContext);
//         const index = notificationObjectsWithItems.findIndex(
//           (notificationObject) => notificationObject.id === orderDeliverToPerson.id,
//         );

//         if (index === -1) {
//           notificationObjectsWithItems.push({
//             ...orderDeliverToPerson,
//             notification: { ...order, items: orderRequestItems },
//           });
//         } else {
//           notificationObjectsWithItems[index].notification.items = orderRequestItems;
//         }
//       }

//       const index = notificationObjectsWithItems.findIndex(
//         (notificationObject) => notificationObject.id === orderRequestor.id,
//       );

//       if (index === -1) {
//         notificationObjectsWithItems.push({
//           ...orderRequestor,
//           notification: { ...order, items: orderRequestItems },
//         });
//       } else {
//         notificationObjectsWithItems[index].notification.items = orderRequestItems;
//       }

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_DELETED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({ message: 'No payload to send a delete order email. Skipping sending email' });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order deleted email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestCancelledNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestCreatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const siteManagersPromise = this.#_getSiteManagers(order);
//       const inventoryManagersPromise = this.#_getInventoryManagers();
//       const assetManagersPromise = this.#_getAssetManagers();
//       const noSkuBuyersPromise = this.#_getNoSKUBuyers();

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);

//       const [tenantAdminEmailAddress, siteManagers, inventoryManagers, assetManagers, noSkuBuyers] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         siteManagersPromise,
//         inventoryManagersPromise,
//         assetManagersPromise,
//         noSkuBuyersPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects(
//         [...siteManagers, ...inventoryManagers, ...assetManagers, ...noSkuBuyers],
//         order,
//       );

//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           assetManagers,
//           inventoryManagers,
//           noSkuBuyers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_CREATED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send a order request created email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order request created email.' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestCreatedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestItemDeliveredNotification = async (
//     emailPayload: DeliverNotificationPayloadInput,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const siteManagersPromise = this.#_getSiteManagers(order);
//       // const inventoryManagersPromise = this.#_getInventoryManagers();
//       // const assetManagersPromise = this.#_getAssetManagers();
//       // const noSkuBuyersPromise = this.#_getNoSKUBuyers();
//       const orderRequestorPromise = this.#_getOrderRequestor(order, userContext);

//       const [
//         tenantAdminEmailAddress,
//         siteManagers,
//         // inventoryManagers,
//         // assetManagers,
//         // noSkuBuyers,
//         orderRequestor,
//       ] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         siteManagersPromise,
//         // inventoryManagersPromise,
//         // assetManagersPromise,
//         // noSkuBuyersPromise,
//         orderRequestorPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects(
//         [
//           ...siteManagers,
//           //  ...inventoryManagers,
//           // ...assetManagers,
//           //  ...noSkuBuyers
//         ],
//         order,
//       );

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);

//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           // assetManagers,
//           // inventoryManagers,
//           // noSkuBuyers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );

//       /* Sends mail to deliver to person if requestor and deliver to person are not the same. */
//       if (order.deliverToId && order.createdById !== order.deliverToId) {
//         const orderDeliverToPerson = await this.#_getOrderDeliverToPerson(order.deliverToId, userContext);
//         const index = notificationObjectsWithItems.findIndex(
//           (notificationObject) => notificationObject.id === orderDeliverToPerson.id,
//         );

//         if (index === -1) {
//           notificationObjectsWithItems.push({
//             ...orderDeliverToPerson,
//             notification: { ...order, items: orderRequestItems },
//           });
//         } else {
//           notificationObjectsWithItems[index].notification.items = orderRequestItems;
//         }
//       }

//       const index = notificationObjectsWithItems.findIndex(
//         (notificationObject) => notificationObject.id === orderRequestor.id,
//       );

//       if (index === -1) {
//         notificationObjectsWithItems.push({
//           ...orderRequestor,
//           notification: { ...order, items: orderRequestItems },
//         });
//       } else {
//         notificationObjectsWithItems[index].notification.items = orderRequestItems;
//       }

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_DELIVERED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send an order request item delivered email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order request item delivered email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestItemDeliveredNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestItemReturnedNotification = async (
//     emailPayload: ReturnNotificationPayloadInput,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const orderRequestorPromise = this.#_getOrderRequestor(order, userContext);

//       const [tenantAdminEmailAddress, orderRequestor] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         orderRequestorPromise,
//       ]);

//       const notificationObjectsWithItems: OrderRequestNotificationPayload[] = [];

//       /* Sends mail to deliver to person if requestor and deliver to person are not the same. */
//       if (order.deliverToId && order.createdById !== order.deliverToId) {
//         const orderDeliverToPerson = await this.#_getOrderDeliverToPerson(order.deliverToId, userContext);
//         const index = notificationObjectsWithItems.findIndex(
//           (notificationObject) => notificationObject.id === orderDeliverToPerson.id,
//         );

//         if (index === -1) {
//           notificationObjectsWithItems.push({
//             ...orderDeliverToPerson,
//             notification: { ...order, items: orderRequestItems },
//           });
//         } else {
//           notificationObjectsWithItems[index].notification.items = orderRequestItems;
//         }
//       }

//       const index = notificationObjectsWithItems.findIndex(
//         (notificationObject) => notificationObject.id === orderRequestor.id,
//       );

//       if (index === -1) {
//         notificationObjectsWithItems.push({
//           ...orderRequestor,
//           notification: { ...order, items: orderRequestItems },
//         });
//       } else {
//         notificationObjectsWithItems[index].notification.items = orderRequestItems;
//       }

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_ITEMS_RETURNED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send an order request item returned email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order request item return email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestItemReturnedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestReceivedNotification = async (
//     emailPayload: ExpandedOrderNotificationPayload,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const orderRequestorPromise = this.#_getOrderRequestor(order, userContext);
//       const noSkuBuyersPromise = this.#_getNoSKUBuyers();

//       const [tenantAdminEmailAddress, orderRequestor, noSkuBuyers] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         orderRequestorPromise,
//         noSkuBuyersPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects(noSkuBuyers, order);

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);
//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           noSkuBuyers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );

//       /* Sends mail to deliver to person if requestor and deliver to person are not the same. */
//       if (order.deliverToId && order.createdById !== order.deliverToId) {
//         const orderDeliverToPerson = await this.#_getOrderDeliverToPerson(order.deliverToId, userContext);
//         const index = notificationObjectsWithItems.findIndex(
//           (notificationObject) => notificationObject.id === orderDeliverToPerson.id,
//         );

//         if (index === -1) {
//           notificationObjectsWithItems.push({
//             ...orderDeliverToPerson,
//             notification: { ...order, items: orderRequestItems },
//           });
//         } else {
//           notificationObjectsWithItems[index].notification.items = orderRequestItems;
//         }
//       }

//       const index = notificationObjectsWithItems.findIndex(
//         (notificationObject) => notificationObject.id === orderRequestor.id,
//       );

//       if (index === -1) {
//         notificationObjectsWithItems.push({
//           ...orderRequestor,
//           notification: { ...order, items: orderRequestItems },
//         });
//       } else {
//         notificationObjectsWithItems[index].notification.items = orderRequestItems;
//       }

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_RECEIVED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send an order received email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call', orderRequestor });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error) {
//       logger.error({ error, message: 'Error sending ORDER RECEIVED email notification:' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestReceivedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestStatusUpdatedNotification = async (
//     emailPayload: ExpandedOrderNotificationPayload,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;

//       if (orderRequestItems.length === 0) {
//         return;
//       }

//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const siteManagersPromise = this.#_getSiteManagers(order);
//       const inventoryManagersPromise = this.#_getInventoryManagers();
//       const assetManagersPromise = this.#_getAssetManagers();
//       const noSkuBuyersPromise = this.#_getNoSKUBuyers();

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);

//       const [tenantAdminEmailAddress, siteManagers, inventoryManagers, assetManagers, noSkuBuyers] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         siteManagersPromise,
//         inventoryManagersPromise,
//         assetManagersPromise,
//         noSkuBuyersPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects(
//         [...siteManagers, ...inventoryManagers, ...assetManagers, ...noSkuBuyers],
//         order,
//       );

//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           assetManagers,
//           inventoryManagers,
//           noSkuBuyers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );
//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_STATUS_UPDATED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send an order status update email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error) {
//       logger.error({ error, message: 'Error in sending order status update email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestStatusUpdatedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestBackOrderedNotification = async (
//     emailPayload: ExpandedOrderNotificationPayload,
//     userContext: UserContext,
//   ) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const buyersPromise = this.#_getNoSKUBuyers();

//       const [tenantAdminEmailAddress, buyers] = await Promise.all([tenantAdminEmailAddressPromise, buyersPromise]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects([...buyers], order);

//       notificationObjects.forEach((notificationObject) => {
//         notificationObject.notification.items = orderRequestItems.filter(
//           ({ status }) => status === OrderRequestItemEntity.OrderRequestItemStatusEnum.BACK_ORDERED,
//         );
//       });

//       const payload = this.#_createMailApiPayload(
//         notificationObjects,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_UPDATED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send a back ordered order email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order request updated email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestBackOrderedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendOrderRequestUpdatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;
//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const orderRequestorPromise = this.#_getOrderRequestor(order, userContext);

//       const [tenantAdminEmailAddress, orderRequestor] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         orderRequestorPromise,
//       ]);

//       const notificationObjectsWithItems: OrderRequestNotificationPayload[] = [];

//       /* Sends mail to deliver to person if requestor and deliver to person are not the same. */
//       if (order.deliverToId && order.createdById !== order.deliverToId) {
//         const orderDeliverToPerson = await this.#_getOrderDeliverToPerson(order.deliverToId, userContext);
//         const index = notificationObjectsWithItems.findIndex(
//           (notificationObject) => notificationObject.id === orderDeliverToPerson.id,
//         );

//         if (index === -1) {
//           notificationObjectsWithItems.push({
//             ...orderDeliverToPerson,
//             notification: { ...order, items: orderRequestItems },
//           });
//         } else {
//           notificationObjectsWithItems[index].notification.items = orderRequestItems;
//         }
//       }

//       const index = notificationObjectsWithItems.findIndex(
//         (notificationObject) => notificationObject.id === orderRequestor.id,
//       );

//       if (index === -1) {
//         notificationObjectsWithItems.push({
//           ...orderRequestor,
//           notification: { ...order, items: orderRequestItems },
//         });
//       } else {
//         notificationObjectsWithItems[index].notification.items = orderRequestItems;
//       }

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.ORDER_REQUEST_UPDATED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send an update order email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: any) {
//       logger.error({ error, message: 'Error in sending order request updated email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendOrderRequestUpdatedNotification',
//           },
//         );
//       }
//     }
//   };

//   sendPickListCreatedNotification = async (emailPayload: ExpandedOrderNotificationPayload, userContext: UserContext) => {
//     try {
//       const { items: orderRequestItems } = emailPayload;
//       const order = emailPayload;

//       if (orderRequestItems.length === 0) {
//         return;
//       }

//       const tenantAdminEmailAddressPromise = this.#_getTenantAdminEmailAddress(userContext);
//       const inventoryManagersPromise = this.#_getInventoryManagers();
//       const assetManagersPromise = this.#_getAssetManagers();

//       const [tenantAdminEmailAddress, inventoryManagers, assetManagers] = await Promise.all([
//         tenantAdminEmailAddressPromise,
//         inventoryManagersPromise,
//         assetManagersPromise,
//       ]);

//       const notificationObjects = this.#_initializeOrderNotificationObjects([...inventoryManagers, ...assetManagers], order);

//       const categorizedOrderItems = groupBy(orderRequestItems, (item) => item.type);
//       const notificationObjectsWithItems = await this.#_attachItemsToUserNotificationObjectsBasedOnPermissions(
//         {
//           assetManagers,
//           inventoryManagers,
//         },
//         categorizedOrderItems,
//         notificationObjects,
//       );

//       const payload = this.#_createMailApiPayload(
//         notificationObjectsWithItems,
//         MailChimpTemplateNameEnum.PICK_LIST_CREATED,
//         tenantAdminEmailAddress,
//       );
//       if (payload.length === 0) {
//         logger.warn({
//           message: 'No payload to send a pickList created email. Skipping sending email',
//         });
//         logger.info({ emailPayload, message: 'Input to the function call' });
//         return;
//       }
//       await this.#_sendNotifications(payload);
//     } catch (error: unknown) {
//       logger.error({ error, message: 'Error in sending create pickList email' });
//       if (error instanceof Error) {
//         await BugReporterService.reportError(
//           { error, event: { emailPayload } },
//           {
//             ...userContext,
//             functionName: 'sendPickListCreatedNotification',
//           },
//         );
//       }
//     }
//   };
// }

// const isDevelopment = process.env.NODE_ENV !== 'production';
// const basePath = isDevelopment ? '/development' : '/production';

// export const EmailService = new EmailServiceClass(baseEmailServiceUrl, basePath);
