import { role } from "@/shared/constants/adminRole";

export interface ReqAdminDTO {
  userId: string;
  name: string;
  role: role;
  deviceId: string;
}
