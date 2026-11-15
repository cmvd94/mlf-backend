import { role, SuperAdmin, AdminRole } from "./adminRole";

export const ADMIN_ROLE_PRIORITY: Record<role, number> = {
  [SuperAdmin.SUPER_ADMIN]: 100,
  [AdminRole.GENERAL_MANAGER]: 90,
  [AdminRole.ZONE_HEAD]: 80,
  [AdminRole.REGIONAL_MANAGER]: 70,
  [AdminRole.DISTRICT_MANAGER]: 60,
  [AdminRole.SUPERVISOR]: 50,
  [AdminRole.ASSISTANT]: 40,
};
