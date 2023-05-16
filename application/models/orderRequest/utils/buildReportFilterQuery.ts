import { logger } from '@procurenetworks/backend-utils';
import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';
import { DocumentType } from '@typegoose/typegoose';
import { FilterQuery } from 'mongoose';
import { DateFilterTypeEnum } from '../../../const/orderReports';

const _applyDateFilter = ({ condition, startDate, endDate }: { condition: string; startDate: string; endDate: string; }) => {
  switch (condition) {
    case DateFilterTypeEnum.ON: {
      return { $gte: startDate, $lt: endDate };
    }
    case DateFilterTypeEnum.BETWEEN: {
      return { $gte: startDate, $lt: endDate };
    }
    case DateFilterTypeEnum.BEFORE: {
      return { $lt: endDate };
    }
    case DateFilterTypeEnum.AFTER: {
      return { $gte: startDate };
    }
    default:
  }
};

export async function buildGetOrderRequestsReportFilterQuery(
  orderRequestsReportFilters: OrderRequestEntity.OrderRequestReportFiltersV2,
): Promise<FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>>> {
  const query: FilterQuery<DocumentType<OrderRequestEntity.OrderRequestSchema>> = {};
  for (const key of Object.keys(orderRequestsReportFilters) as Array<keyof OrderRequestEntity.OrderRequestReportFiltersV2>) {
    if (orderRequestsReportFilters[key] && Array.isArray(orderRequestsReportFilters[key])) {
      if ((orderRequestsReportFilters[key] as any[]).length === 0) {
        continue;
      }
    }
    switch (key) {
      case 'billToSiteIds': {
        query.billToSiteId = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'createdByIds': {
        query.createdById = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'deliverToIds': {
        query.deliverToId = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'departmentIds': {
        query.departmentId = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'destinationSiteIds': {
        query.destinationSiteId = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'fulfillingSiteIds': {
        query.fulfillingSiteIds = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'orderRequestCodes': {
        query.orderRequestCode = { $in: orderRequestsReportFilters[key] };
        break;
      }
      case 'orderRequestDateType': {
        if (orderRequestsReportFilters.orderRequestDateStart) {
          query.createdAt = _applyDateFilter({
            condition: orderRequestsReportFilters.orderRequestDateType || '',
            startDate: orderRequestsReportFilters.orderRequestDateStart || '',
            endDate: orderRequestsReportFilters.orderRequestDateEnd || '',
          });
        }
        break;
      }
      case 'orderRequestDueDateType': {
        if (orderRequestsReportFilters.orderRequestDueDateType) {
          query.dueDate = _applyDateFilter({
            condition: orderRequestsReportFilters.orderRequestDueDateType || '',
            startDate: orderRequestsReportFilters.orderRequestDueDateStart || '',
            endDate: orderRequestsReportFilters.orderRequestDueDateEnd || '',
          });
        }
        break;
      }
      case 'orderRequestStatuses': {
        query.status = { $in: orderRequestsReportFilters[key] };
        break;
      }
      default:
        continue;
    }
  }
  logger.debug({ message: 'Query for fetching orderRequest(s)', payload: { query } });
  return query;
}
