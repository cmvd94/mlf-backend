import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GetAdminUsersFilterDTO } from "@/shared/dto/admin/crudUserDTO";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class GetUserListUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (userId: string, dto: GetAdminUsersFilterDTO) => {
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

      const userList = await this.adminRepository.getUserList(
        query,
        validPage,
        limit
      );

      this.logger.info(`Admin User list fetched successfully by ${userId}`);

      return {
        userList: userList,
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
