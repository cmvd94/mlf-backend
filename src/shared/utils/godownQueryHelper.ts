import { ReqAdminDTO } from "../dto/admin/reqAdminDTO";
import { GetGodownListQueryDTO } from "../dto/admin/godownDTO";
import { AdminRole, SuperAdmin } from "../constants/adminRole";
import { Godown } from "@/domain/entities/admin/Godown";
import { generateObjectId } from "./generateObjectId";
import { Types } from "mongoose";

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
    case AdminRole.GODOWN_MANAGER:
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

export const validateStockModificationAccess = (
  admin: ReqAdminDTO,
  godown: Godown
): boolean => {
  if (admin.role === SuperAdmin.SUPER_ADMIN) return true;

  const rawAdmin = admin as any;
  const scope = admin.accessScope || {
    country: rawAdmin.country,
    zone: rawAdmin.zone,
    state: rawAdmin.state,
    district: rawAdmin.district,
  };

  const adminIdStr = (
    admin.userId ||
    rawAdmin._id?.toString() ||
    rawAdmin.id?.toString() ||
    ""
  ).trim();
  const godownIdStr = (
    godown._id?.toString() ||
    (godown as any).id?.toString() ||
    ""
  ).trim();

  const godownIds: string[] = Array.isArray(admin.godownId)
    ? admin.godownId.map((id: any) => id?.toString())
    : admin.godownId
    ? [(admin.godownId as any).toString()]
    : [];
  const inAdminGodowns = godownIds.includes(godownIdStr);

  switch (admin.role) {
    case AdminRole.GENERAL_MANAGER:
      return Boolean(scope.country && scope.country === godown.country);

    case AdminRole.ZONE_HEAD:
      return Boolean(
        scope.country &&
          scope.zone &&
          scope.country === godown.country &&
          scope.zone === godown.zone
      );

    case AdminRole.REGIONAL_MANAGER:
      return Boolean(
        scope.country &&
          scope.zone &&
          scope.state &&
          scope.country === godown.country &&
          scope.zone === godown.zone &&
          scope.state === godown.state
      );

    case AdminRole.DISTRICT_MANAGER:
      return Boolean(
        scope.country &&
          scope.zone &&
          scope.state &&
          scope.district &&
          scope.country === godown.country &&
          scope.zone === godown.zone &&
          scope.state === godown.state &&
          scope.district === godown.district
      );

    case AdminRole.GODOWN_MANAGER: {
      const godownManagerIdStr = godown.godownManagerId
        ? (
            (godown.godownManagerId as any)._id?.toString() ||
            (godown.godownManagerId as any).toString()
          ).trim()
        : "";
      const isGodownManager = godownManagerIdStr.length > 0 && godownManagerIdStr === adminIdStr;

      if (!inAdminGodowns && !isGodownManager) {
        return false;
      }

      if (scope.district && scope.district !== godown.district) return false;
      if (scope.state && scope.state !== godown.state) return false;
      if (scope.zone && scope.zone !== godown.zone) return false;
      if (scope.country && scope.country !== godown.country) return false;
      return true;
    }

    case AdminRole.SUPERVISOR:
    case AdminRole.ASSISTANT:
    case AdminRole.BILLING_USER: {
      const supervisorIds: string[] = Array.isArray(godown.supervisorId)
        ? godown.supervisorId.map((s: any) => s?._id?.toString() || s?.toString())
        : godown.supervisorId
        ? [((godown.supervisorId as any)._id?.toString() || (godown.supervisorId as any).toString())]
        : [];

      const assistantIds: string[] = Array.isArray(godown.assistantId)
        ? godown.assistantId.map((a: any) => a?._id?.toString() || a?.toString())
        : godown.assistantId
        ? [((godown.assistantId as any)._id?.toString() || (godown.assistantId as any).toString())]
        : [];

      const billingUserIdStr = godown.billingUserId
        ? (
            (godown.billingUserId as any)._id?.toString() ||
            (godown.billingUserId as any).toString()
          ).trim()
        : "";

      const isSupervisor = supervisorIds.includes(adminIdStr);
      const isAssistant = assistantIds.includes(adminIdStr);
      const isBillingUser = billingUserIdStr.length > 0 && billingUserIdStr === adminIdStr;

      if (!inAdminGodowns && !isSupervisor && !isAssistant && !isBillingUser) {
        return false;
      }

      if (scope.district && scope.district !== godown.district) return false;
      if (scope.state && scope.state !== godown.state) return false;
      if (scope.zone && scope.zone !== godown.zone) return false;
      if (scope.country && scope.country !== godown.country) return false;
      return true;
    }

    default:
      return false;
  }
};

export const compareAdminAndGodownLocation = (
  admin: ReqAdminDTO,
  godown: Godown
) => {
  return validateStockModificationAccess(admin, godown);
};

export const validateStockModificationAccessWithFetch = async (
  admin: ReqAdminDTO,
  godownOrId: any,
  godownRepository: any
): Promise<boolean> => {
  if (admin.role === SuperAdmin.SUPER_ADMIN) return true;
  if (!godownOrId) return false;

  let godown = godownOrId;
  if (
    typeof godown === "string" ||
    godown instanceof Types.ObjectId ||
    !godown.country ||
    !godown.type
  ) {
    const id = (godown._id || godown).toString();
    godown = await godownRepository.findGodownById(id);
  }
  if (!godown || godown.isDeleted) return false;

  return validateStockModificationAccess(admin, godown);
};
