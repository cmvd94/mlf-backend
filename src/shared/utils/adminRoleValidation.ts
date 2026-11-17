import { AdminRole } from "../constants/adminRole";

export function isValidRole(role: string): boolean {
  return Object.values(AdminRole).includes(role as AdminRole);
}
