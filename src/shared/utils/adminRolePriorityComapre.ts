import { role, SuperAdmin } from "@/shared/constants/adminRole";
import { ADMIN_ROLE_PRIORITY } from "../constants/adminRolePriority";

export function checkRolePriority(
  currentUserRole: role,
  targetUserRole: role
): boolean {
  const currentUserPriorityValue = ADMIN_ROLE_PRIORITY[currentUserRole];
  const targetUserPriorityValue = ADMIN_ROLE_PRIORITY[targetUserRole];

  if (
    currentUserPriorityValue === undefined ||
    targetUserPriorityValue === undefined
  ) {
    return false;
  }

  // Super Admin has full management privileges over all roles
  if (currentUserRole === SuperAdmin.SUPER_ADMIN) {
    return true;
  }

  // Role can only manage strictly lower roles (same level and higher level are forbidden)
  return currentUserPriorityValue > targetUserPriorityValue;
}
