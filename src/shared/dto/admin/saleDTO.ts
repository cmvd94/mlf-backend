export interface CreateSaleItemDTO {
  itemId?: string;
  godownStockId: string;
  godownId?: string;
  companyGodownId?: string;
  lotNo?: string;
  dcNo?: string;
  hsnCode?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  quantity?: number; // Fallback / alias for actualQuantity
  rate: number;
  perId?: string;
}

export interface CreateSaleDTO {
  date: string;
  salesTypeId: string;
  partyId: string;
  invoiceNo?: string;
  dcNo?: string;
  companyGodownId?: string;
  items: CreateSaleItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;
  narration?: string;
}

export interface UpdateSaleDTO {
  date?: string;
  salesTypeId?: string;
  partyId?: string;
  invoiceNo?: string;
  dcNo?: string;
  companyGodownId?: string;
  items?: CreateSaleItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;
  narration?: string;
}

export interface GetSaleListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  salesTypeId?: string;
  partyId?: string;
  godownId?: string;
  companyGodownId?: string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAvailableStockForSaleQueryDTO {
  godownId?: string;
  itemId?: string;
  search?: string;
}
