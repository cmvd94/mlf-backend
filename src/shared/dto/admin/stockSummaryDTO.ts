export interface GetStockSummaryQueryDTO {
  godownId?: string;
  groupId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  showZeroStock?: boolean;
}

export interface StockSummaryBatchDTO {
  batchNo: string;
  godownId: string;
  godownName: string;
  godownCode?: string;
  particulars: string; // e.g. "Debit/26-9-26 Nandhi Dyeing" or "L10/dc169/8-10-26 Sv Colony"
  quantity: number;
  rate: number;
  value: number;
  formattedQuantity: string;
  formattedRate: string;
  formattedValue: string;
  uom: string;
}

export interface StockSummaryItemDTO {
  itemId: string;
  itemName: string;
  itemCode: string;
  groupId?: string;
  groupName?: string;
  uom: string;
  quantity: number;
  averageRate: number;
  totalValue: number;
  formattedQuantity: string;
  formattedRate: string;
  formattedValue: string;
  batchesCount: number;
  batches: StockSummaryBatchDTO[];
}

export interface StockSummaryGroupDTO {
  groupId: string;
  groupName: string;
  groupCode?: string;
  uom: string;
  totalQuantity: number;
  averageRate: number;
  totalValue: number;
  formattedQuantity: string;
  formattedRate: string;
  formattedValue: string;
  itemsCount: number;
  items: StockSummaryItemDTO[];
}

export interface StockSummaryGrandTotalDTO {
  totalQuantity: number;
  averageRate: number;
  totalValue: number;
  formattedQuantity: string;
  formattedRate: string;
  formattedValue: string;
  groupsCount: number;
  itemsCount: number;
}

export interface StockSummaryResponseDTO {
  companyName: string;
  period: {
    startDate?: string;
    endDate?: string;
    formattedPeriod: string;
  };
  godownFilter: {
    godownId?: string;
    godownName?: string;
  };
  groups: StockSummaryGroupDTO[];
  grandTotal: StockSummaryGrandTotalDTO;
}
