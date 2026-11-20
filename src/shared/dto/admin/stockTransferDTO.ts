export interface CreateStockTransferSourceItemDTO {
  godownStockId: string;
  quantity: number;
  uomId?: string;
  uomQuantity?: number;
  rate?: number;
}

export interface CreateStockTransferDestinationItemDTO {
  itemId: string;
  godownId: string;
  batchNo: string;
  quantity: number;
  rate?: number;
  uomId?: string;
  uomQuantity?: number;
  perId?: string;
}

export interface CreateStockTransferDTO {
  date: string;
  sourceItems: CreateStockTransferSourceItemDTO[];
  destinationItems: CreateStockTransferDestinationItemDTO[];
  narration?: string;
}

export interface GetStockTransferListQueryDTO {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  godownId?: string;
  search?: string;
}

export interface GetAvailableStockQueryDTO {
  godownId?: string;
  itemId?: string;
  search?: string;
}
