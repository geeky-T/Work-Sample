import {
  OrderRequestEntity,
  OrderRequestItemEntity,
  StringObjectID,
  UserEntity,
  WorkspaceEntity,
} from '@procurenetworks/inter-service-contracts';

export type ReturnAttachmentsForReturnNotificationPayload = {
  containerId: string;
  destinationSiteId: StringObjectID;
  destinationSiteName?: string;
  qrCodeImage: string;
};

export type ExpandedOrderNotificationPayload = OrderRequestEntity.ExpandedOrderRequestType;

export type OrderReadyForPickUpNotificationPayload = ExpandedOrderNotificationPayload & {
  partnerName: string;
}

export type ReturnNotificationPayloadInput = ExpandedOrderNotificationPayload & {
  returnAttachments: ReturnAttachmentsForReturnNotificationPayload;
};

export type DeliverNotificationPayloadInput = ExpandedOrderNotificationPayload & {
  deliveryAttachments: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput['deliveryVerificationDetails'];
};

export type OrderRequestNotificationPayload = UserEntity.UserSchema & {
  notification: ExpandedOrderNotificationPayload & {
    deliveryAttachments?: OrderRequestItemEntity.UpdateOrderRequestItemsStatusByTrackingUpdatesInput['deliveryVerificationDetails'];
    returnAttachments?: ReturnAttachmentsForReturnNotificationPayload;
    partnerName?: string;
  };
};

/** To be moved to inter-service-contract. */
export type MailChimpHandlebarTemplateVariablePayload = {
  content: string | number | boolean | any[] | undefined;
  name: string;
};

export type MailChimpEmailPayload = {
  bounce: string;
  origin: string;
  subject: string;
  templateName: WorkspaceEntity.AllowedPermissionsSubjectEnum;
  templateVariables: MailChimpHandlebarTemplateVariablePayload[];
  to: string;
};
