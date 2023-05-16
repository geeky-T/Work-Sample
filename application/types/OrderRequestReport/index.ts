import { OrderRequestEntity } from '@procurenetworks/inter-service-contracts';

export type GetOrderRequestsReportInput = OrderRequestEntity.OrderRequestReportFiltersV2 & {
  sortDirection?: string;
};
