import { logger } from '@procurenetworks/backend-utils';
import {
  CategoryEntity,
  LocationEntity,
  OrderRequestEntity,
  StringObjectID,
  UserContext,
  UserEntity,
} from '@procurenetworks/inter-service-contracts';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';
import {
  CategoryService,
  DepartmentService,
  LocationService,
  ProjectService,
  UserService,
} from '../transport/__grpc/client/services';
import {
  DeliverNotificationPayloadInput,
  ExpandedOrderNotificationPayload,
  ReturnNotificationPayloadInput,
} from '../types/NotificationTypes/payloads';
import { ExpandOrderEntitiesInput } from '../types/common';

const _getRequiredUserIdsForOrders = (expandOrderEntitiesInput: Array<ExpandOrderEntitiesInput>) => {
  const userIdsInOrderRequests: StringObjectID[] = [];
  const orderRequests = expandOrderEntitiesInput.map((input) => input.orderRequest);
  orderRequests.forEach((orderRequest) => {
    if (orderRequest.deliverToId) {
      userIdsInOrderRequests.push(orderRequest.deliverToId);
    }
    if (orderRequest.createdById) {
      userIdsInOrderRequests.push(orderRequest.createdById);
    }
  });
  return uniq(userIdsInOrderRequests);
};

export const expandOrderEntities = async (
  expandOrderEntitiesInputs: Array<ExpandOrderEntitiesInput>,
  userContext: UserContext,
): Promise<Array<ExpandedOrderNotificationPayload | ReturnNotificationPayloadInput | DeliverNotificationPayloadInput>> => {
  if (expandOrderEntitiesInputs.length === 0) {
    return [];
  }

  if (
    expandOrderEntitiesInputs.length <= 100 &&
    expandOrderEntitiesInputs.every(({ orderRequestItems }) =>
      orderRequestItems?.every(({ imageUrl }) => !imageUrl || imageUrl.length < 200),
    )
  ) {
    logger.debug({ input: { expandOrderEntitiesInputs }, message: `Expanding order entities` });
  }

  const requiredProjectIds: StringObjectID[] = [];
  const requiredDepartmentIds: StringObjectID[] = [];
  const requiredCategoryIds: StringObjectID[] = [];
  const requiredSiteIds: StringObjectID[] = [];

  const userIdsInOrders = _getRequiredUserIdsForOrders(expandOrderEntitiesInputs);

  expandOrderEntitiesInputs.forEach(({ orderRequestItems, orderRequest, returnAttachments }) => {
    if (orderRequestItems) {
      orderRequestItems.forEach(({ projectId, categoryId, fromSiteId }) => {
        projectId && requiredProjectIds.push(projectId);
        categoryId && requiredCategoryIds.push(categoryId);
        fromSiteId && requiredSiteIds.push(fromSiteId);
      });
    }
    if (orderRequest) {
      const { billToSiteId, destinationSiteId, availableAtSiteIds, departmentId, fulfillingSiteIds } = orderRequest;
      billToSiteId && requiredSiteIds.push(billToSiteId);
      destinationSiteId && requiredSiteIds.push(destinationSiteId);
      availableAtSiteIds &&
        availableAtSiteIds.length > 0 &&
        availableAtSiteIds.forEach((siteId) => requiredSiteIds.push(siteId));
      fulfillingSiteIds &&
        fulfillingSiteIds.length > 0 &&
        fulfillingSiteIds.forEach((siteId) => requiredSiteIds.push(siteId));
      departmentId && requiredDepartmentIds.push(departmentId);
    }
    if (returnAttachments) {
      const { destinationSiteId } = returnAttachments;
      destinationSiteId && requiredSiteIds.push(destinationSiteId);
    }
  });

  /** Fetching required information for expansion. */
  /** Note: UserContext is irrelevant, its sent because its a required param for rpc call.*/
  const projectObjectsPromise = ProjectService.getProjectsByIdsAcrossTenants(
    {
      filters: { projectIds: requiredProjectIds },
      projection: { _id: 1, name: 1, status: 1 },
    },
    userContext,
  );
  /** Note: UserContext is irrelevant, its sent because its a required param for rpc call.*/
  const departmentObjectPromise = DepartmentService.getDepartmentsByIdsAcrossTenants(
    {
      filters: { departmentIds: requiredDepartmentIds },
      projection: { _id: 1, name: 1, status: 1 },
    },
    userContext,
  );
  /** Note: UserContext is irrelevant, its sent because its a required param for rpc call.*/
  const siteObjectsPromise = LocationService.getLocationsByIdsAcrossTenants(
    {
      filters: {
        locationIds: requiredSiteIds,
        types: [LocationEntity.LocationTypeEnum.SITE, LocationEntity.LocationTypeEnum.PARTNER_TENANT],
      },
      projection: { _id: 1, name: 1, status: 1 },
    },
    userContext,
  );
  /** Note: UserContext is irrelevant, its sent because its a required param for rpc call.*/
  const usersOfOrdersObjectsPromise = UserService.getUsersByIdsAcrossTenants(
    {
      filters: {
        userIds: userIdsInOrders,
        statuses: Object.values(UserEntity.UserStatusEnum),
      },
      projection: { _id: 1, firstName: 1, lastName: 1, status: 1, emailId: 1 },
    },
    userContext,
  );
  const categoryObjectsPromise = CategoryService.getCategoriesByIdsAcrossTenants(
    {
      filters: {
        categoryIds: requiredCategoryIds,
        statuses: Object.values(CategoryEntity.CategoryStatusEnum),
      },

      projection: { _id: 1, name: 1, status: 1 },
    },
    userContext,
  );

  const [{ projects }, { departments }, { locations: sites }, { users }, { categories }] = await Promise.all([
    projectObjectsPromise,
    departmentObjectPromise,
    siteObjectsPromise,
    usersOfOrdersObjectsPromise,
    categoryObjectsPromise,
  ]);

  const requiredUsersForOrdersByUserId = keyBy(users, (user) => user._id.toString());

  const resultantOrders = expandOrderEntitiesInputs.map((expandOrderEntitiesInput) => {
    let resultantOrder:
      | OrderRequestEntity.ExpandedOrderRequestType
      | ReturnNotificationPayloadInput
      | DeliverNotificationPayloadInput = {
      ...expandOrderEntitiesInput.orderRequest,
      items: expandOrderEntitiesInput.orderRequestItems || [],
    };
    const { items: orderItems, ...order } = resultantOrder;
    const { returnAttachments, deliveryAttachments } = expandOrderEntitiesInput;
    if (orderItems) {
      orderItems.map((item) => {
        /* Attach Project name to the order item if projectId is present. */
        if (item.projectId) {
          const projectDetail = projects.find((project) => project._id.toString() === item.projectId?.toString());
          if (projectDetail) {
            // eslint-disable-next-line no-param-reassign
            item.projectName = projectDetail.name;
          }
        }
        /* Attach Category name to the order item if categoryId is present. */
        if (item.categoryId) {
          const categoryDetail = categories.find((category) => category._id.toString() === item.categoryId?.toString());
          if (categoryDetail) {
            // eslint-disable-next-line no-param-reassign
            item.categoryName = categoryDetail.name;
          }
        }
        return item;
      });
    }
    /* Attach department name to the order if departmentId is present. */
    if (order.departmentId) {
      const departmentDetail = departments.find(
        (department) => department._id.toString() === order.departmentId?.toString(),
      );
      if (departmentDetail) {
        resultantOrder.departmentName = departmentDetail.name;
      }
    }
    /* Attach site name to the order if siteId is present. */
    if (order.destinationSiteId) {
      const siteDetail = sites.find((site) => site._id.toString() === order.destinationSiteId.toString());
      if (siteDetail) {
        resultantOrder.destinationSiteName = siteDetail.name;
      }
    }
    if (order.billToSiteId) {
      const siteDetail = sites.find((site) => site._id.toString() === order.billToSiteId.toString());
      if (siteDetail) {
        resultantOrder.billToSiteName = siteDetail.name;
      }
    }
    if (order.fulfillingSiteIds) {
      resultantOrder.fulfillingSites = [];
      order.fulfillingSiteIds.forEach((siteId) => {
        const siteDetail = sites.find((site) => site._id.toString() === siteId.toString());
        if (siteDetail) {
          resultantOrder.fulfillingSites?.push({ siteId, siteName: siteDetail.name });
        }
      });
    }

    /* Attach return site name to the order if destinationSiteId is present. */
    if (returnAttachments && returnAttachments.destinationSiteId) {
      const siteDetail = sites.find((site) => site._id.toString() === returnAttachments.destinationSiteId);
      if (siteDetail) {
        returnAttachments.destinationSiteName = siteDetail.name;
      }
      resultantOrder = { ...resultantOrder, returnAttachments } as ReturnNotificationPayloadInput;
    }

    /* Attach return site name to the order if destinationSiteId is present. */
    if (deliveryAttachments) {
      resultantOrder = {
        ...resultantOrder,
        deliveryAttachments,
      } as DeliverNotificationPayloadInput;
    }

    /* Attach deliverToId name to the order if deliverToId is present. */
    if (order.deliverToId) {
      const { [order.deliverToId.toString()]: deliverToUser } = requiredUsersForOrdersByUserId;
      if (deliverToUser) {
        resultantOrder.recipient = deliverToUser;
      } else {
        logger.warn(`Delivery user with ${order.deliverToId} id could not be found`);
      }
    }
    /* Attach createdByName to the order if createdById is present. */
    const { [order.createdById.toString()]: createdByUserDetails } = requiredUsersForOrdersByUserId;
    if (createdByUserDetails) {
      resultantOrder.requestor = createdByUserDetails;
    } else {
      logger.warn(`Creator user with ${order.createdById} id could not be found`);
    }

    return resultantOrder;
  });
  return resultantOrders;
};
