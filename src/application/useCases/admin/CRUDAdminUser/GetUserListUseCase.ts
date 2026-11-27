import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GetAdminUsersFilterDTO } from "@/shared/dto/admin/crudUserDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { AdminRole, SuperAdmin } from "@/shared/constants/adminRole";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class GetUserListUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (
    userId: string,
    dto: GetAdminUsersFilterDTO,
    reqAdmin?: ReqAdminDTO
  ) => {
    try {
      if (!reqAdmin || reqAdmin.role !== SuperAdmin.SUPER_ADMIN) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
        );
      }
      const query: any = {};
      query.isDeleted = false;
      if (dto.role) query.role = dto.role;
      if (dto.isActive !== undefined) query.isActive = dto.isActive;

      // Apply geographic scope filtering if requester is not Super Admin
      if (reqAdmin && reqAdmin.role !== SuperAdmin.SUPER_ADMIN && reqAdmin.accessScope) {
        if (reqAdmin.accessScope.country) {
          query["accessScope.country"] = reqAdmin.accessScope.country;
        }
        if (
          reqAdmin.role !== AdminRole.GENERAL_MANAGER &&
          reqAdmin.accessScope.zone
        ) {
          query["accessScope.zone"] = reqAdmin.accessScope.zone;
        }
        if (
          reqAdmin.role !== AdminRole.GENERAL_MANAGER &&
          reqAdmin.role !== AdminRole.ZONE_HEAD &&
          reqAdmin.accessScope.state
        ) {
          query["accessScope.state"] = reqAdmin.accessScope.state;
        }
        if (
          reqAdmin.role !== AdminRole.GENERAL_MANAGER &&
          reqAdmin.role !== AdminRole.ZONE_HEAD &&
          reqAdmin.role !== AdminRole.REGIONAL_MANAGER &&
          reqAdmin.accessScope.district
        ) {
          query["accessScope.district"] = reqAdmin.accessScope.district;
        }
      }

      const page = dto.page || 1;
      const limit = dto.limit || 10;

      const totalItems = await this.adminRepository.countUsers(query);
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const validPage = Math.min(page, totalPages);

      const rawUserList = await this.adminRepository.getUserList(
        query,
        validPage,
        limit
      );

      const enrichedUserList = rawUserList.map((user: any) => {
        const isSelf = user._id?.toString() === userId;
        const isSubordinate = reqAdmin
          ? checkRolePriority(reqAdmin.role, user.role) &&
            compareLocationOfReqAdminNewUserWarehouse(
              reqAdmin.role,
              reqAdmin.accessScope,
              user.accessScope
            )
          : false;

        return {
          ...user,
          canEdit: isSelf || isSubordinate,
          canDelete:
            !isSelf && user.role !== SuperAdmin.SUPER_ADMIN && isSubordinate,
          canToggleStatus: !isSelf && isSubordinate,
        };
      });

      const assignableRoles = reqAdmin
        ? Object.values(AdminRole).filter((r) =>
            checkRolePriority(reqAdmin.role, r)
          )
        : [];

      this.logger.info(`Admin User list fetched successfully by ${userId}`);

      return {
        userList: enrichedUserList,
        assignableRoles,
        pagination: {
          totalItems,
          currentPage: validPage,
          totalPages,
          hasNextPage: validPage < totalPages,
          hasPrevPage: validPage > 1,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetAdminUserListUseCase,
        this.logger
      );
    }
  };
}
