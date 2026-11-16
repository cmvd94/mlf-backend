import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GetAdminUsersFilterDTO } from "@/shared/dto/admin/crudUserDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { AdminRole, SuperAdmin } from "@/shared/constants/adminRole";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
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
      const query: any = {};
      query.isDeleted = false;
      if (dto.role) query.role = dto.role;
      if (dto.isActive !== undefined) query.isActive = dto.isActive;

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
          ? checkRolePriority(reqAdmin.role, user.role)
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
