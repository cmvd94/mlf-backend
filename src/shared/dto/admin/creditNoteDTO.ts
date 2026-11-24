export interface CreateCreditNoteItemDTO {
  _id?: string;
  itemId: string;
  godownId: string;
  companyGodownId?: string;
  dcNo?: string;
  lotNo?: string;
  batchNo?: string;
  uomId: string;
  uomQuantity: number;
  actualQuantity: number;
  billedQuantity: number;
  rate: number;
  perId: string;
  godownStockId?: string;
}

export interface CreateCreditNoteDTO {
  date: string;
  partyId: string;
  purchaseTypeId?: string;
  creditNoteTypeId?: string;
  companyGodownId: string;
  items: CreateCreditNoteItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;

  // Optional legacy fields for backward compatibility
  godownId?: string;
  itemId?: string;
  dcNo?: string;
  lotNo?: string;
  batchNo?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  rate?: number;
  perId?: string;
}

export interface UpdateCreditNoteDTO {
  date?: string;
  partyId?: string;
  purchaseTypeId?: string;
  creditNoteTypeId?: string;
  companyGodownId?: string;
  items?: CreateCreditNoteItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;

  // Optional legacy fields for backward compatibility
  godownId?: string;
  itemId?: string;
  dcNo?: string;
  lotNo?: string;
  batchNo?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  rate?: number;
  perId?: string;
}

export interface GetCreditNoteListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  partyId?: string;
  purchaseTypeId?: string;
  creditNoteTypeId?: string;
  companyGodownId?: string;
  godownId?: string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
}
