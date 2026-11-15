import { role } from "@/shared/constants/adminRole";
import { AccessScope } from "@/shared/utils/validateLocationAdminNewUser";

export interface ReqAdminDTO {
  userId: string;
  name: string;
  role: role;
  deviceId: string;
  accessScope: AccessScope;
}
