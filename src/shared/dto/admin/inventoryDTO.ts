export interface CreatePartyDTO {
  name: string;
  partyCode?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  gstin?: string;
  isActive?: boolean;
}

export interface UpdatePartyDTO {
  name?: string;
  partyCode?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  gstin?: string;
  isActive?: boolean;
}

export interface CreatePurchaseTypeDTO {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePurchaseTypeDTO {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateUomDTO {
  name: string;
  symbol: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateUomDTO {
  name?: string;
  symbol?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreatePerUnitDTO {
  name: string;
  symbol: string;
  multiplier?: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePerUnitDTO {
  name?: string;
  symbol?: string;
  multiplier?: number;
  description?: string;
  isActive?: boolean;
}

export interface CreateItemGroupDTO {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateItemGroupDTO {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateItemDTO {
  name: string;
  itemCode?: string;
  itemGroupId?: string;
  description?: string;
  defaultUomId: string;
  defaultPerId: string;
  hsnCodeId?: string;
  hsnCode?: string;
  standardRate?: number;
  openingStock?: number;
  isActive?: boolean;
}

export interface UpdateItemDTO {
  name?: string;
  itemCode?: string;
  itemGroupId?: string;
  description?: string;
  defaultUomId?: string;
  defaultPerId?: string;
  hsnCodeId?: string;
  hsnCode?: string;
  standardRate?: number;
  isActive?: boolean;
}

export interface CreateHsnCodeDTO {
  hsnCode: string;
  description?: string;
  gstRate?: number;
  isActive?: boolean;
}

export interface UpdateHsnCodeDTO {
  hsnCode?: string;
  description?: string;
  gstRate?: number;
  isActive?: boolean;
}

export interface InventoryQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
