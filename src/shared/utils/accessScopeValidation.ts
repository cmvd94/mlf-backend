import { role } from "../constants/adminRole";

export const validateAccessScope = (
  role: role,
  accessScope: {
    country?: string;
    zone?: string;
    state?: string;
    district?: string;
    branch?: string;
  }
) => {
  // Allow flexible enterprise access scope validation for MLF
  return true;
};
