import { AdminAccessScope } from "@/shared/constants/adminAccessScope";
import HttpException from "../exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "../constants/errorCodesMessages";
import { AdminRole, role } from "../constants/adminRole";
import { AccessScope } from "./validateLocationAdminNewUser";

export type AccessScopeType = {
  [country: string]: {
    [zone: string]: {
      [state: string]: {
        [district: string]: {
          pincodes: string[];
        };
      };
    };
  };
};

export const isValidAccessScope = (
  country: string | undefined,
  zone: string | undefined,
  state: string | undefined,
  district: string | undefined
): boolean => {
  const scope = AdminAccessScope as AccessScopeType;

  // If district is provided, validate entire hierarchy
  if (district && state && zone && country) {
    return (
      country in scope &&
      zone in scope[country] &&
      state in scope[country][zone] &&
      district in scope[country][zone][state]
    );
  }

  // If state is provided, validate up to state
  if (state && zone && country) {
    return (
      country in scope &&
      zone in scope[country] &&
      state in scope[country][zone]
    );
  }

  // If zone is provided, validate up to zone
  if (zone && country) {
    return country in scope && zone in scope[country];
  }

  // If only country is provided, validate country
  if (country) {
    return country in scope;
  }

  return false;
};

export const validateAccessScope = (role: role, accessScope: AccessScope) => {
  // Validate based on role
  switch (role) {
    case AdminRole.GENERAL_MANAGER:
      // General Manager should only have country
      if (
        !accessScope.country ||
        accessScope.zone ||
        accessScope.state ||
        accessScope.district
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE_POLICY,
          ERROR_CODES.INVALID_ACCESS_SCOPE_POLICY
        );
      }
      if (!isValidAccessScope(accessScope.country, undefined, undefined, undefined)) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }
      break;

    case AdminRole.ZONE_HEAD:
      // Zone Head should only have country and zone
      if (
        !accessScope.country ||
        !accessScope.zone ||
        accessScope.state ||
        accessScope.district
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE_POLICY,
          ERROR_CODES.INVALID_ACCESS_SCOPE_POLICY
        );
      }
      if (!isValidAccessScope(accessScope.country, accessScope.zone, undefined, undefined)) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }
      break;

    case AdminRole.REGIONAL_MANAGER:
      // Regional Manager should have country, zone and state
      if (
        !accessScope.country ||
        !accessScope.zone ||
        !accessScope.state ||
        accessScope.district
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE_POLICY,
          ERROR_CODES.INVALID_ACCESS_SCOPE_POLICY
        );
      }
      if (!isValidAccessScope(accessScope.country, accessScope.zone, accessScope.state, undefined)) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }
      break;

    case AdminRole.DISTRICT_MANAGER:
    case AdminRole.GODOWN_MANAGER:
    case AdminRole.SUPERVISOR:
    case AdminRole.ASSISTANT:
    case AdminRole.BILLING_USER:
      // These roles should have all 4 fields (country, zone, state, district)
      if (
        !accessScope.country ||
        !accessScope.zone ||
        !accessScope.state ||
        !accessScope.district
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE_POLICY,
          ERROR_CODES.INVALID_ACCESS_SCOPE_POLICY
        );
      }
      if (
        !isValidAccessScope(
          accessScope.country,
          accessScope.zone,
          accessScope.state,
          accessScope.district
        )
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }
      break;

    default:
      throw new HttpException(
        400,
        ERROR_MESSAGES.INVALID_ACCESS_SCOPE_POLICY,
        ERROR_CODES.INVALID_ACCESS_SCOPE_POLICY
      );
  }
};
