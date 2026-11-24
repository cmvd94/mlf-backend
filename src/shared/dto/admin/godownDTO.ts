import { GodownType } from "@/domain/entities/admin/Godown";

export interface CreateGodownDTO {
  name: string;
  godownId?: string;
  type: GodownType;
  description?: string;
  country: string;
  zone: string;
  state: string;
  district: string;
  pincode: string;
  godownManagerId?: string | null;
  supervisorId?: string[] | null;
  assistantId?: string[] | null;
  billingUserId?: string | null;
  isActive?: boolean;
}

export interface UpdateGodownDTO {
  name?: string;
  godownId?: string;
  type?: GodownType;
  description?: string;
  isActive?: boolean;
  godownManagerId?: string | null;
  supervisorId?: string[];
  newSupervisorIds?: string[];
  removeSupervisorIds?: string[];
  assistantId?: string[];
  newAssistantIds?: string[];
  removeAssistantIds?: string[];
  billingUserId?: string | null;
}

export interface GetGodownParamsDTO {
  id: string;
}

export interface GetGodownListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  type?: GodownType;
  isActive?: boolean;
  country?: string;
  zone?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface UpdateGodownIsActiveDTO {
  godownIds: string[];
  isActive: boolean;
}

export interface GetEligibleGodownAdminsQueryDTO {
  search?: string;
  role?: string;
  country?: string;
  zone?: string;
  state?: string;
  district?: string;
}
