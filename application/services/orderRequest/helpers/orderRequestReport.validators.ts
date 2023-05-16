import { ValidationError } from '@procurenetworks/backend-utils';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { DateFilterTypeEnum } from '../../../const/orderReports';

export const validateOrderReportFilters = (filters: OrderRequestEntity.OrderRequestReportFiltersV2) => {
  const permissibleDateFilterTypeValues: string[] = Object.keys(DateFilterTypeEnum).map(
    (permissibleDateType) => DateFilterTypeEnum[permissibleDateType as keyof typeof DateFilterTypeEnum],
  );
  const {
    billToSiteIds,
    categoryIds,
    createdByIds,
    deliverToIds,
    departmentIds,
    destinationSiteIds,
    fulfillingSiteIds,
    orderItemStatuses,
    orderRequestCodes,
    orderRequestDateType,
    orderRequestDueDateType,
    orderRequestStatuses,
    projectIds,
    skus,
  } = filters;

  if (orderRequestCodes && !Array.isArray(orderRequestCodes)) {
    throw new ValidationError({
      debugMessage: `Invalid orderIds type.`,
      message: `Invalid orderIds type.`,
      params: { orderRequestCodes },
      where: 'validateOrderReportFilters',
    });
  }
  if (departmentIds && !Array.isArray(departmentIds)) {
    throw new ValidationError({
      debugMessage: `Invalid departments type.`,
      message: `Invalid departments type.`,
      params: { departmentIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (createdByIds && !Array.isArray(createdByIds)) {
    throw new ValidationError({
      debugMessage: `Invalid departments type.`,
      message: `Invalid departments type.`,
      params: { departmentIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (deliverToIds && !Array.isArray(deliverToIds)) {
    throw new ValidationError({
      debugMessage: `Invalid departments type.`,
      message: `Invalid departments type.`,
      params: { departmentIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (destinationSiteIds && !Array.isArray(destinationSiteIds)) {
    throw new ValidationError({
      debugMessage: `Invalid departments type.`,
      message: `Invalid departments type.`,
      params: { departmentIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (billToSiteIds && !Array.isArray(billToSiteIds)) {
    throw new ValidationError({
      debugMessage: `Invalid departments type.`,
      message: `Invalid departments type.`,
      params: { departmentIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (fulfillingSiteIds && !Array.isArray(fulfillingSiteIds)) {
    throw new ValidationError({
      debugMessage: `Invalid fromSite type.`,
      message: `Invalid fromSite type.`,
      params: { fulfillingSiteIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (skus && !Array.isArray(skus)) {
    throw new ValidationError({
      debugMessage: `Invalid sku type.`,
      message: `Invalid sku type.`,
      params: { skus },
      where: 'validateOrderReportFilters',
    });
  }
  if (categoryIds && !Array.isArray(categoryIds)) {
    throw new ValidationError({
      debugMessage: `Invalid category type.`,
      message: `Invalid category type.`,
      params: { categoryIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (projectIds && !Array.isArray(projectIds)) {
    throw new ValidationError({
      debugMessage: `Invalid projects type.`,
      message: `Invalid projects type.`,
      params: { projectIds },
      where: 'validateOrderReportFilters',
    });
  }
  if (orderItemStatuses && !Array.isArray(orderItemStatuses)) {
    throw new ValidationError({
      debugMessage: `Invalid orderItemStatus type.`,
      message: `Invalid orderItemStatus type.`,
      params: { orderItemStatuses },
      where: 'validateOrderReportFilters',
    });
  }
  if (orderRequestStatuses && !Array.isArray(orderRequestStatuses)) {
    throw new ValidationError({
      debugMessage: `Invalid orderStatus type.`,
      message: `Invalid orderStatus type.`,
      params: { orderRequestStatuses },
      where: 'validateOrderReportFilters',
    });
  }

  if (
    orderRequestDateType &&
    (!(typeof orderRequestDateType === 'string') || !permissibleDateFilterTypeValues.includes(orderRequestDateType))
  ) {
    throw new ValidationError({
      debugMessage: `Invalid orderDate value.`,
      message: `Invalid orderDate value.`,
      params: { orderRequestDateType },
      where: 'validateOrderReportFilters',
    });
  }
  if (
    orderRequestDueDateType &&
    (!(typeof orderRequestDueDateType === 'string') || !permissibleDateFilterTypeValues.includes(orderRequestDueDateType))
  ) {
    throw new ValidationError({
      debugMessage: `Invalid dueDate value.`,
      message: `Invalid dueDate value.`,
      params: { orderRequestDueDateType },
      where: 'validateOrderReportFilters',
    });
  }
};
