export interface CreatePurchaseItemDTO {
  itemId: string;
  godownId: string;
  uomId: string;
  uomQuantity: number;
  actualQuantity: number;
  billedQuantity: number;
  rate: number;
  perId: string;
}

export interface CreatePurchaseDTO {
  date: string;
  partyId: string;
  purchaseTypeId: string;
  items: CreatePurchaseItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;

  // Optional legacy fields for backward compatibility
  godownId?: string;
  itemId?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  rate?: number;
  perId?: string;
}

export interface UpdatePurchaseDTO {
  date?: string;
  partyId?: string;
  purchaseTypeId?: string;
  items?: CreatePurchaseItemDTO[];
  isGstBill?: boolean;
  gstPercentage?: number;
  notes?: string;

  // Optional legacy fields for backward compatibility
  godownId?: string;
  itemId?: string;
  uomId?: string;
  uomQuantity?: number;
  actualQuantity?: number;
  billedQuantity?: number;
  rate?: number;
  perId?: string;
}

export interface GetPurchaseListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  partyId?: string;
  itemId?: string;
  purchaseTypeId?: string;
  godownId?: string;
  startDate?: string;
  endDate?: string;
}
