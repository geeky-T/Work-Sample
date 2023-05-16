import { OrderRequestItemEntity } from '@procurenetworks/inter-service-contracts';

export const createSearchTermsForOrderRequest = (
  orderRequestItems: Pick<
    OrderRequestItemEntity.OrderRequestItemSchema,
    'description' | 'nonRemovableNotes' | 'note' | 'sku' | 'title' | 'upcCode' | 'website'
  >[],
): string[] => {
  let searchTerms: string[] = [];
  orderRequestItems.forEach((orderRequestItem) => {
    if (orderRequestItem.description) {
      searchTerms.push(orderRequestItem.description);
    }
    if (orderRequestItem.nonRemovableNotes) {
      orderRequestItem.nonRemovableNotes.forEach((note: any) => {
        searchTerms = searchTerms.concat(Object.values(note));
      });
    }
    if (orderRequestItem.note) {
      searchTerms.push(orderRequestItem.note);
    }
    if (orderRequestItem.sku) {
      searchTerms.push(orderRequestItem.sku);
    }
    if (orderRequestItem.title) {
      searchTerms.push(orderRequestItem.title);
    }
    if (orderRequestItem.upcCode) {
      searchTerms.push(orderRequestItem.upcCode);
    }
    if (orderRequestItem.website) {
      searchTerms.push(orderRequestItem.website);
    }
  });
  return searchTerms;
};
