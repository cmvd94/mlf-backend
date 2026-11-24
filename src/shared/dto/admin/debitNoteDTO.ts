export interface CreateDebitNoteItemDTO {
  itemId?: string;
  godownStockId: string;
  godownId?: string;
  companyGodownId?: string;
  lotNo?: string;
  dcNo?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  quantity?: number; // Fallback / alias for actualQuantity
  rate: number;
  perId?: string;
}

export interface CreateDebitNoteDTO {
  date: string;
  salesTypeId?: string;
  debitNoteTypeId?: string;
  partyId: string;
  dcNo?: string;
  companyGodownId?: string;
  items: CreateDebitNoteItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;
  narration?: string;
}

export interface UpdateDebitNoteDTO {
  date?: string;
  salesTypeId?: string;
  debitNoteTypeId?: string;
  partyId?: string;
  dcNo?: string;
  companyGodownId?: string;
  items?: CreateDebitNoteItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;
  narration?: string;
}

export interface GetDebitNoteListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  salesTypeId?: string;
  debitNoteTypeId?: string;
  partyId?: string;
  godownId?: string;
  companyGodownId?: string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAvailableStockForDebitNoteQueryDTO {
  godownId?: string;
  itemId?: string;
  search?: string;
}
