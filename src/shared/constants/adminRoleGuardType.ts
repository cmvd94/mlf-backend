import { AdminRole, role, SuperAdmin } from "./adminRole";

export const ROLE_GUARD_ONLY_SUPERADMIN: SuperAdmin[] = [
  SuperAdmin.SUPER_ADMIN,
];

export const ROLE_GUARD_TILL_TOP_LEVEL_ADMIN: role[] = [
  SuperAdmin.SUPER_ADMIN,
  AdminRole.GENERAL_MANAGER,
];

export const ROLE_GUARD_TILL_MID_LEVEL_ADMIN: role[] = [
  ...ROLE_GUARD_TILL_TOP_LEVEL_ADMIN,
  AdminRole.ZONE_HEAD,
  AdminRole.REGIONAL_MANAGER,
  AdminRole.DISTRICT_MANAGER,
];

export const ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR: role[] = [
  ...ROLE_GUARD_TILL_MID_LEVEL_ADMIN,
  AdminRole.SUPERVISOR,
];

export const ROLE_GUARD_ALL: role[] = [
  ...ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR,
  AdminRole.ASSISTANT,
];
