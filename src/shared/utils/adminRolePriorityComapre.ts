import { role } from "@/shared/constants/adminRole";
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

  // A role can ONLY manage/edit roles strictly below its own hierarchy level.
  // Roles of equal or higher level cannot be created, updated, or deleted.
  return currentUserPriorityValue > targetUserPriorityValue;
}
