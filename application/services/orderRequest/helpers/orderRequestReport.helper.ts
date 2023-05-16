import { ValidationError } from '@procurenetworks/backend-utils';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { orderBy } from 'lodash';
import { DateFilterTypeEnum } from '../../../const/orderReports';

const _parseToDoubleDigitString = (number: number) => {
  return number.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
};

const _formatStringDateToISOStyle = (stringDate: string) => {
  const stringDateParts = stringDate.split('/');
  const year = _parseToDoubleDigitString(+Number.parseInt(stringDateParts[2], 10));
  const date = _parseToDoubleDigitString(+Number.parseInt(stringDateParts[1], 10));
  const month = _parseToDoubleDigitString(Number.parseInt(stringDateParts[0], 10));
  return `${year}-${month}-${date}T00:00:00.000Z`;
};

const _transformStartDateAndEndDateBasedOnCondition = ({
  condition,
  endDate,
  startDate,
  variableName,
}: {
  condition: DateFilterTypeEnum;
  startDate?: string;
  endDate?: string;
  variableName: string;
}): { endDate?: string; startDate?: string; } => {
  switch (condition) {
    case DateFilterTypeEnum.ON: {
      if (!startDate || typeof startDate !== 'string') {
        throw new ValidationError({
          debugMessage: `CASE "ON": {startDate existence & type check}`,
          message: `Missing/Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      const startDateObject = new Date(_formatStringDateToISOStyle(startDate));
      if (isNaN(startDateObject.getTime())) {
        throw new ValidationError({
          debugMessage: `CASE "ON": {startDate validity check}`,
          message: `Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      const endDateObject = new Date(startDateObject);
      endDateObject.setUTCDate(startDateObject.getUTCDate() + 1);
      return {
        endDate: endDateObject.toISOString(),
        startDate: startDateObject.toISOString(),
      };
    }
    case DateFilterTypeEnum.BETWEEN: {
      if (!startDate || typeof startDate !== 'string') {
        throw new ValidationError({
          debugMessage: `CASE "BETWEEN": {startDate existence & type check}`,
          message: `Missing/Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      if (!endDate || typeof endDate !== 'string') {
        throw new ValidationError({
          debugMessage: `CASE "BETWEEN": {endDate existence & type check}`,
          message: `Missing/Invalid endDate for ${variableName} filter.`,
          params: { endDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      const startDateObject = new Date(_formatStringDateToISOStyle(startDate));
      const endDateObject = new Date(_formatStringDateToISOStyle(endDate));
      endDateObject.setUTCDate(endDateObject.getUTCDate() + 1);
      startDateObject.setUTCDate(startDateObject.getUTCDate() + 1);
      if (isNaN(startDateObject.getTime())) {
        throw new ValidationError({
          debugMessage: `CASE "BETWEEN": {startDate validity check}`,
          message: `Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      if (isNaN(endDateObject.getTime())) {
        throw new ValidationError({
          debugMessage: `CASE "BETWEEN": {endDate validity check}`,
          message: `Invalid endDate for ${variableName} filter.`,
          params: { endDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      if (startDateObject.toISOString() > endDateObject.toISOString()) {
        throw new ValidationError({
          debugMessage: `CASE "BETWEEN": {startDate-endDate timeline order check}`,
          message: `Invalid dates, startDate greater than endDate for ${variableName} filter.`,
          params: { endDate, startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      return {
        endDate: endDateObject.toISOString(),
        startDate: startDateObject.toISOString(),
      };
    }
    case DateFilterTypeEnum.BEFORE: {
      if (!endDate || typeof endDate !== 'string') {
        throw new ValidationError({
          debugMessage: `CASE "BEFORE": {endDate existence & type check}`,
          message: `Missing/Invalid endDate for ${variableName} filter.`,
          params: { endDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      const endDateObject = new Date(_formatStringDateToISOStyle(endDate));
      if (isNaN(endDateObject.getTime())) {
        throw new ValidationError({
          debugMessage: `CASE "BEFORE": {endDate validity check}`,
          message: `Invalid endDate for ${variableName} filter.`,
          params: { endDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      return {
        endDate: endDateObject.toISOString(),
      };
    }
    case DateFilterTypeEnum.AFTER: {
      if (!startDate || typeof startDate !== 'string') {
        throw new ValidationError({
          debugMessage: `CASE "AFTER": {startDate existence & type check}`,
          message: `Missing/Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      const startDateObject = new Date(_formatStringDateToISOStyle(startDate));
      if (isNaN(startDateObject.getTime())) {
        throw new ValidationError({
          debugMessage: `CASE "AFTER": {startDate validity check}`,
          message: `Invalid startDate for ${variableName} filter.`,
          params: { startDate, variableName },
          where: '_transformStartDateAndEndDateBasedOnCondition',
        });
      }
      startDateObject.setUTCDate(startDateObject.getUTCDate() + 1);
      return {
        startDate: startDateObject.toISOString(),
      };
    }
    default:
      return {};
  }
};

export const checkOrderRequestFilters = (filters: OrderRequestEntity.OrderRequestReportFiltersV2) => {
  const {
    billToSiteIds,
    createdByIds,
    deliverToIds,
    departmentIds,
    destinationSiteIds,
    fulfillingSiteIds,
    orderRequestCodes,
    orderRequestDateType,
    orderRequestDueDateType,
    orderRequestStatuses,
  } = filters;
  return !!(
    (billToSiteIds && billToSiteIds.length > 0) ||
    (departmentIds && departmentIds.length > 0) ||
    orderRequestDueDateType ||
    (fulfillingSiteIds && fulfillingSiteIds.length > 0) ||
    (orderRequestCodes && orderRequestCodes.length > 0) ||
    orderRequestDateType ||
    (orderRequestStatuses && orderRequestStatuses.length > 0) ||
    (destinationSiteIds && destinationSiteIds.length > 0) ||
    (createdByIds && createdByIds.length > 0) ||
    (deliverToIds && deliverToIds.length > 0)
  );
};

export const checkOrderRequestItemFilters = (filters: OrderRequestEntity.OrderRequestReportFiltersV2) => {
  const { categoryIds, orderItemStatuses, projectIds, skus, itemIds } = filters;
  return !!(
    (categoryIds && categoryIds.length > 0) ||
    (orderItemStatuses && orderItemStatuses.length > 0) ||
    (projectIds && projectIds.length > 0) ||
    (skus && skus.length > 0) ||
    (itemIds && itemIds.length > 0)
  );
};

export const sortOrderRequestReports = (
  orderRequests: Array<OrderRequestEntity.ExpandedOrderRequestType>,
  sortDirection = 'desc',
) => {
  return orderBy(orderRequests, ['createdAt'], [sortDirection === 'desc' ? 'desc' : 'asc']);
};

export const transformOrderReportFilters = (filters: OrderRequestEntity.OrderRequestReportFiltersV2) => {
  let transformedFilterParameters = filters;

  Object.keys(transformedFilterParameters).forEach((filter) => {
    const { [filter as unknown as keyof OrderRequestEntity.OrderRequestReportFiltersV2]: filterVal } =
      transformedFilterParameters;
    if (filterVal === undefined || filterVal === null || (Array.isArray(filterVal) && filterVal.length === 0)) {
      // eslint-disable-next-line no-param-reassign
      delete transformedFilterParameters[filter as unknown as keyof OrderRequestEntity.OrderRequestReportFiltersV2];
    }
  });

  const {
    orderRequestDateEnd,
    orderRequestDateStart,
    orderRequestDateType,
    orderRequestDueDateEnd,
    orderRequestDueDateStart,
    orderRequestDueDateType,
  } = transformedFilterParameters;

  if (orderRequestDateType) {
    // if
    // const { startDate, endDate } = _transformStartDateAndEndDateBasedOnCondition({
    //   condition: orderRequestDateType as unknown as DateFilterTypeEnum,
    //   startDate: orderRequestDateStart,
    //   endDate: orderRequestDateEnd,
    //   variableName: 'orderRequestDate',
    // });
    let startDate = orderRequestDateStart;
    if (!orderRequestDateStart) {
      startDate = new Date(0).toISOString();
    }
    const endDate = orderRequestDateEnd;

    transformedFilterParameters = {
      ...transformedFilterParameters,
      orderRequestDateEnd: endDate,
      orderRequestDateStart: startDate,
    };
  }
  if (orderRequestDueDateType) {
    // const { startDate, endDate } = _transformStartDateAndEndDateBasedOnCondition({
    //   condition: orderRequestDueDateType as unknown as DateFilterTypeEnum,
    //   startDate: orderRequestDueDateStart,
    //   endDate: orderRequestDueDateEnd,
    //   variableName: 'orderRequestDueDate',
    // });
    let startDate = orderRequestDueDateStart;
    if (!orderRequestDueDateStart) {
      startDate = new Date(0).toISOString();
    }
    const endDate = orderRequestDueDateEnd;
    transformedFilterParameters = {
      ...transformedFilterParameters,
      orderRequestDueDateEnd: endDate,
      orderRequestDueDateStart: startDate,
    };
  }
  return transformedFilterParameters;
};
