import { PickListRepository } from '@models/pickList/pickList.repository';
import { ForbiddenError, InternalServerError, logger, ProcureError } from '@procurenetworks/backend-utils';
import {
  Entity,
  OrderRequestEntity,
  OrderRequestItemEntity,
  PickListEntity,
  StringObjectID,
  UserContext,
} from '@procurenetworks/inter-service-contracts';
import { EmailService } from '@services/externals/EmailServiceV3';
import { expandOrderEntities } from '@utils/expandOrderEntities';
import mongoose from 'mongoose';
import { CreatePickListsRepositoryInput } from '../../types/PickList';
import { contextUserUtil } from '../../utils/userAuthentication/contextUser.util';
import { PermissionValidator } from '../../utils/validators/orderRequestPermission.validator';
import { OrderRequestServiceV2 } from '../orderRequest/orderRequest.service';
import { OrderRequestItemServiceV2 } from '../orderRequestItem/orderRequestItem.service';
import {
  createExternalOrderMoveTransactionForPickList,
  packPickedOrderRequestItemsIntoContainers,
  parseCreatePickListInput,
  parseCreatePickListInputForChildTenant,
} from './helpers/createPickList.helper';
import { validateCreatePickList } from './helpers/pickList.validators';

class PickListServiceClass {
  /* Queries */
  async getAllPickLists(
    getAllPickListsInput: PickListEntity.GetAllPickListsInput,
    userContext: UserContext,
  ): Promise<PickListEntity.GetAllPickListsPayload> {
    const pickLists = await PickListRepository.getAllPickLists(getAllPickListsInput, userContext);
    return { pickLists };
  }

  /* Mutations */
  async createPickList(
    createPickListInput: PickListEntity.CreatePickListInput,
    userContext: UserContext,
    retryCount = 0,
  ): Promise<Entity.MutationResponse> {
    await PermissionValidator.verifyOrderRequestPickPermissions(userContext);
    const { orderRequestId, siteId } = createPickListInput;
    /* Fetching order request to check whether the current user has permission to access it or not. */
    const {
      orderRequests: [orderRequest],
    } = await OrderRequestServiceV2.getAllOrderRequests({ filters: { orderRequestIds: [orderRequestId] } }, userContext);

    if (!orderRequest) {
      throw new ForbiddenError({
        debugMessage: `Order request with id: ${orderRequestId} is not accessible to the user.`,
        message: `The order request you are trying to pick and pack is not accessible to you. Please refresh and try again`,
        where: `${__filename} - ${this.createPickList.name}`,
      });
    } else if (orderRequest.entitySource === Entity.EntitySourceEnum.EXTERNAL) {
      throw new ForbiddenError({
        debugMessage: `You are not authorized to pick and pack this order. Please contact an administrator for assistance.`,
        message: `You are not authorized to pick and pack this order. Please contact an administrator for assistance.`,
        where: `${__filename} - ${this.createPickList.name}`,
      });
    }

    const pickableOrderRequestItems = await OrderRequestItemServiceV2.getPickableOrderRequestItemsOfOrderRequest(
      orderRequestId,
      userContext,
    );

    await validateCreatePickList(orderRequest, pickableOrderRequestItems, createPickListInput, userContext);

    const { orderRequestItemsToCreate, orderRequestItemsToUpdate, pickListToCreate } = parseCreatePickListInput(
      createPickListInput,
      pickableOrderRequestItems,
      userContext,
    );

    let orderRequestInChildTenant: OrderRequestEntity.OrderRequestSchema | undefined = undefined,
      orderRequestItemsToCreateInChildTenant: OrderRequestItemEntity.CreateOrderRequestItemInput[] = [],
      orderRequestItemsToUpdateInChildTenant: OrderRequestItemEntity.OrderRequestItemSchema[] = [],
      pickListToCreateInChildTenant: CreatePickListsRepositoryInput | undefined = undefined;

    let childOrderRequestItemsCreated: Array<OrderRequestItemEntity.OrderRequestItemSchema> = [];

    const childUserContext: UserContext = contextUserUtil.switchTenantForInternalUsage(
      userContext,
      orderRequest.childTenantId as StringObjectID,
    );
    const session = await mongoose.startSession();
    let createdOrderRequestItems: OrderRequestItemEntity.OrderRequestItemSchema[] = [];
    try {
      await session.withTransaction(async () => {
        if (orderRequestItemsToCreate.length !== 0) {
          createdOrderRequestItems = await OrderRequestItemServiceV2.createOrderRequestItems(
            orderRequestItemsToCreate,
            userContext,
            session,
          );
          logger.debug({
            createdOrderRequestItems,
            message: `${createdOrderRequestItems.length} orderRequestItems created.`,
          });
        }
        if (orderRequest.type === OrderRequestEntity.OrderRequestTypeEnum.EXTERNAL) {
          const { orderRequests } = await OrderRequestServiceV2.getAllOrderRequests(
            { filters: { entityIdsInSourceTenant: [orderRequestId] } },
            childUserContext,
          );

          [orderRequestInChildTenant] = orderRequests;
          const parsedPayload = await parseCreatePickListInputForChildTenant(
            createPickListInput,
            orderRequestInChildTenant,
            createdOrderRequestItems,
            childUserContext,
            userContext,
          );
          orderRequestItemsToCreateInChildTenant = parsedPayload.orderRequestItemsToCreateInChildTenant;
          orderRequestItemsToUpdateInChildTenant = parsedPayload.orderRequestItemsToUpdateInChildTenant;
          pickListToCreateInChildTenant = parsedPayload.pickListToCreateInChildTenant;
          if (orderRequestItemsToCreateInChildTenant.length !== 0) {
            childOrderRequestItemsCreated = await OrderRequestItemServiceV2.createOrderRequestItems(
              orderRequestItemsToCreateInChildTenant,
              childUserContext,
              session,
            );
          }
        }
        if (orderRequestItemsToUpdate.length !== 0) {
          await OrderRequestItemServiceV2.bulkUpdateOrderRequestItems(orderRequestItemsToUpdate, userContext, session);
          logger.debug({
            message: `${orderRequestItemsToUpdate.length} orderRequestItems updated.`,
            orderRequestItemsToUpdate,
          });
          if (orderRequestItemsToUpdateInChildTenant.length !== 0) {
            await OrderRequestItemServiceV2.bulkUpdateOrderRequestItems(
              orderRequestItemsToUpdateInChildTenant,
              childUserContext,
              session,
            );
          }
        }
        const promises = [
          OrderRequestServiceV2.updateFulfillingSites(orderRequestId, siteId, userContext, session),
          PickListRepository.createPickList(pickListToCreate, session),
        ];
        if (pickListToCreateInChildTenant) {
          const { orderRequestId: orderRequestIdInChildTenant, siteId: siteIdInChildTenant } = pickListToCreateInChildTenant;
          promises.push(
            OrderRequestServiceV2.updateFulfillingSites(
              orderRequestIdInChildTenant,
              siteIdInChildTenant,
              childUserContext,
              session,
            ),
          );
          promises.push(PickListRepository.createPickList(pickListToCreateInChildTenant, session));
        }
        await Promise.all(promises);

        const trackingDetailsByOrderRequestItemId = await packPickedOrderRequestItemsIntoContainers(
          createPickListInput,
          orderRequest,
          pickableOrderRequestItems,
          userContext,
        );

        if (pickListToCreateInChildTenant && orderRequestInChildTenant) {
          const trannsactionDetailsByOrderRequestItemIdInChildTenant = await createExternalOrderMoveTransactionForPickList(
            pickListToCreateInChildTenant,
            orderRequestInChildTenant,
            orderRequestItemsToUpdateInChildTenant,
            trackingDetailsByOrderRequestItemId,
            childUserContext,
          );
          await OrderRequestItemServiceV2.pushTransactionDetailsToCorrespondingOrderRequestItems(
            trannsactionDetailsByOrderRequestItemIdInChildTenant,
            session,
          );
        }

        await OrderRequestItemServiceV2.pushTrackingDetailsToCorrespondingOrderRequestItems(
          trackingDetailsByOrderRequestItemId,
          session,
        );

        // Sending notifications to external users
        try {
          if (pickListToCreateInChildTenant && orderRequestInChildTenant) {

            const effectiveChildContext = contextUserUtil.switchTenantForInternalUsage(userContext, orderRequest.childTenantId as StringObjectID);

            const [pickListEmailPayload] = await expandOrderEntities(
              [{ orderRequest: orderRequestInChildTenant, orderRequestItems: [...childOrderRequestItemsCreated, ...orderRequestItemsToUpdateInChildTenant] }],
              effectiveChildContext,
            );

            await EmailService.sendOrderReadyForPickUpNotification(pickListEmailPayload, userContext);
          }
        } catch (error) {
          logger.error({ message: `Error while sending notification to external users` });
        }


      });
      await OrderRequestServiceV2.updateLeastItemStatus({ orderRequestId }, userContext);


    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error({ error, message: 'Error in createPickList' });
      if (typeof error.errmsg === 'string' && error.errmsg === 'WriteConflict' && retryCount < 2) {
        await this.createPickList(createPickListInput, userContext, retryCount + 1);
      } else if (error instanceof ProcureError) {
        throw error;
      } else {
        throw new InternalServerError({
          error,
          debugMessage: 'Unknown error -Failed to create pick list.',
          message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
          params: {
            createPickListInput,
          },
          report: true,
          where: `${__filename} ${this.createPickList.name}`,
        });
      }
    } finally {
      await session.endSession();
    }
    /** Sending packing-list email to relevant officials of current tenant. */
    /** SUSPENDED TASK-> OR-531. */
    // const packedOrderRequestItems = orderRequestItemsToUpdate.filter(
    //   (item) => item.status === OrderRequestItemEntity.OrderRequestItemStatusEnum.PACKED,
    // );
    // try {
    //   const [pickListEmailPayload] = await expandOrderEntities(
    //     [{ orderRequest: orderRequests[0], orderRequestItems: packedOrderRequestItems }],
    //     userContext.tenantId,
    //   );
    //   EmailService.sendPickListCreatedNotification(pickListEmailPayload, userContext.tenantId);

    /** Sending order request updated email to relevant officials of current tenant. */
    /** SUSPENDED TASK-> OR-531. */
    //   const [orderRequestUpdatedEmailPayload] = await expandOrderEntities(
    //     [
    //       {
    //         orderRequest: orderRequests[0],
    //         orderRequestItems: [...createdOrderRequestItems, ...orderRequestItemsToUpdate],
    //       },
    //     ],
    //     userContext.tenantId,
    //   );
    //   EmailService.sendOrderRequestUpdatedNotification(
    //     orderRequestUpdatedEmailPayload,
    //     userContext.tenantId,
    //   );
    // } catch (error) {
    //   console.error('Error in sending notification', error);
    // }
    OrderRequestServiceV2.unblockOrderRequest({ orderRequestId }, userContext);
    return { success: true };
  }
}

export const PickListServiceV2 = new PickListServiceClass();
