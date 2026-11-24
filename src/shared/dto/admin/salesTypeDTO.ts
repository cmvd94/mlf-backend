export interface CreateSalesTypeDTO {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSalesTypeDTO {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
