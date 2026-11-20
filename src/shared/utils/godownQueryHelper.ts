import { ReqAdminDTO } from "../dto/admin/reqAdminDTO";
import { GetGodownListQueryDTO } from "../dto/admin/godownDTO";
import { AdminRole, SuperAdmin } from "../constants/adminRole";
import { Godown } from "@/domain/entities/admin/Godown";
import { generateObjectId } from "./generateObjectId";

const handleLocationFilters = (
  dto: GetGodownListQueryDTO,
  reqAdmin: ReqAdminDTO
) => {
  if (reqAdmin.role === SuperAdmin.SUPER_ADMIN) {
    return true;
  }

  const scope = reqAdmin.accessScope || {};

  if (dto.country && scope.country && dto.country !== scope.country) {
    return false;
  }
  if (dto.zone && scope.zone && dto.zone !== scope.zone) {
    return false;
  }
  if (dto.state && scope.state && dto.state !== scope.state) {
    return false;
  }
  if (dto.district && scope.district && dto.district !== scope.district) {
    return false;
  }

  return true;
};

export const generateGodownQuery = (
  dto: GetGodownListQueryDTO,
  reqAdmin: ReqAdminDTO
) => {
  const query: any = { isDeleted: false };
  let hasAccess = handleLocationFilters(dto, reqAdmin);

  if (dto.type) query.type = dto.type;
  if (dto.isActive !== undefined) query.isActive = dto.isActive;
  if (dto.search && dto.search.trim().length > 0) {
    const searchRegex = new RegExp(dto.search.trim(), "i");
    query.$or = [{ name: searchRegex }, { godownId: searchRegex }];
  }

  const scope = reqAdmin.accessScope || {};

  switch (reqAdmin.role) {
    case AdminRole.SUPERVISOR:
    case AdminRole.ASSISTANT:
    case AdminRole.BILLING_USER:
      if (hasAccess) {
        const assignedGodowns = reqAdmin.godownId || [];
        if (assignedGodowns.length > 0) {
          query._id = { $in: assignedGodowns.map((id) => generateObjectId(id)) };
          query.country = scope.country;
          query.zone = scope.zone;
          query.state = scope.state;
          query.district = scope.district;
        } else {
          hasAccess = false;
        }
      }
      break;

    case AdminRole.GODOWN_MANAGER:
    case AdminRole.DISTRICT_MANAGER:
      if (hasAccess) {
        query.country = scope.country;
        query.zone = scope.zone;
        query.state = scope.state;
        query.district = scope.district;
      }
      break;

    case AdminRole.REGIONAL_MANAGER:
      if (hasAccess) {
        query.country = scope.country;
        query.zone = scope.zone;
        query.state = scope.state;
        if (dto.district) query.district = dto.district;
      }
      break;

    case AdminRole.ZONE_HEAD:
      if (hasAccess) {
        query.country = scope.country;
        query.zone = scope.zone;
        if (dto.state) query.state = dto.state;
        if (dto.district) query.district = dto.district;
      }
      break;

    case AdminRole.GENERAL_MANAGER:
      if (hasAccess) {
        query.country = scope.country;
        if (dto.zone) query.zone = dto.zone;
        if (dto.state) query.state = dto.state;
        if (dto.district) query.district = dto.district;
      }
      break;

    case SuperAdmin.SUPER_ADMIN:
      if (dto.country) query.country = dto.country;
      if (dto.zone) query.zone = dto.zone;
      if (dto.state) query.state = dto.state;
      if (dto.district) query.district = dto.district;
      if (dto.pincode) query.pincode = dto.pincode;
      break;

    default:
      hasAccess = false;
  }

  return { query, hasAccess };
};

export const compareAdminAndGodownLocation = (
  admin: ReqAdminDTO,
  godown: Godown
) => {
  if (admin.role === SuperAdmin.SUPER_ADMIN) return true;

  const scope = admin.accessScope || {};

  switch (admin.role) {
    case AdminRole.SUPERVISOR:
    case AdminRole.ASSISTANT:
    case AdminRole.BILLING_USER: {
      const godownIdStr = godown._id?.toString();
      const inAdminGodowns = admin.godownId?.some(
        (id) => id.toString() === godownIdStr
      );
      const isAssignedInGodown =
        (Array.isArray(godown.supervisorId) &&
          godown.supervisorId.some(
            (s: any) => (s._id?.toString() || s.toString()) === admin.userId
          )) ||
        (Array.isArray(godown.assistantId) &&
          godown.assistantId.some(
            (a: any) => (a._id?.toString() || a.toString()) === admin.userId
          )) ||
        (godown.billingUserId &&
          (godown.billingUserId._id?.toString() ||
            godown.billingUserId.toString()) === admin.userId);

      if (!inAdminGodowns && !isAssignedInGodown) {
        return false;
      }

      return (
        scope.district === godown.district &&
        scope.state === godown.state &&
        scope.country === godown.country &&
        scope.zone === godown.zone
      );
    }

    case AdminRole.GODOWN_MANAGER: {
      const isDistrictMatch =
        scope.district === godown.district &&
        scope.state === godown.state &&
        scope.country === godown.country &&
        scope.zone === godown.zone;
      if (!isDistrictMatch) return false;

      // If godown manager has specific assigned godowns, check assignment
      if (admin.godownId && admin.godownId.length > 0) {
        const godownIdStr = godown._id?.toString();
        const inAdminGodowns = admin.godownId.some(
          (id) => id.toString() === godownIdStr
        );
        const isGodownManager =
          godown.godownManagerId &&
          (godown.godownManagerId._id?.toString() ||
            godown.godownManagerId.toString()) === admin.userId;
        return inAdminGodowns || Boolean(isGodownManager);
      }
      return true;
    }

    case AdminRole.DISTRICT_MANAGER:
      return (
        scope.district === godown.district &&
        scope.state === godown.state &&
        scope.country === godown.country &&
        scope.zone === godown.zone
      );

    case AdminRole.REGIONAL_MANAGER:
      return (
        scope.state === godown.state &&
        scope.country === godown.country &&
        scope.zone === godown.zone
      );

    case AdminRole.ZONE_HEAD:
      return scope.zone === godown.zone && scope.country === godown.country;

    case AdminRole.GENERAL_MANAGER:
      return scope.country === godown.country;

    default:
      return false;
  }
};
