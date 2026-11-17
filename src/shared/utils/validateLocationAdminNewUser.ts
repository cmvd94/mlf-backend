import { AdminRole, role, SuperAdmin } from "../constants/adminRole";

export type AccessScope = {
  country?: string;
  zone?: string;
  state?: string;
  district?: string;
  pincode?: string[];
};

export const compareLocationOfReqAdminNewUserWarehouse = (
  adminRole: AdminRole | SuperAdmin,
  adminAccessScope: AccessScope = {},
  newUserAccessScope: AccessScope = {}
): boolean => {
  if (adminRole === SuperAdmin.SUPER_ADMIN) return true;

  const same = (a?: string, b?: string) => a !== undefined && b !== undefined && a === b;

  switch (adminRole) {
    case AdminRole.GENERAL_MANAGER:
      return same(adminAccessScope.country, newUserAccessScope.country);

    case AdminRole.ZONE_HEAD:
      return (
        same(adminAccessScope.country, newUserAccessScope.country) &&
        same(adminAccessScope.zone, newUserAccessScope.zone)
      );

    case AdminRole.REGIONAL_MANAGER:
      return (
        same(adminAccessScope.country, newUserAccessScope.country) &&
        same(adminAccessScope.zone, newUserAccessScope.zone) &&
        same(adminAccessScope.state, newUserAccessScope.state)
      );

    case AdminRole.DISTRICT_MANAGER:
    case AdminRole.GODOWN_MANAGER:
    case AdminRole.SUPERVISOR:
    case AdminRole.ASSISTANT:
    case AdminRole.BILLING_USER:
      return (
        same(adminAccessScope.country, newUserAccessScope.country) &&
        same(adminAccessScope.zone, newUserAccessScope.zone) &&
        same(adminAccessScope.state, newUserAccessScope.state) &&
        same(adminAccessScope.district, newUserAccessScope.district)
      );

    default:
      return false;
  }
};
