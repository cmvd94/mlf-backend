import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { ERROR_MESSAGES, ERROR_CODES } from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import HttpException from "@/shared/exceptions/HttpException";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class GetAUserUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (userId: string, reqAdmin?: ReqAdminDTO) => {
    try {
      const user = await this.adminRepository.findUserById(userId);

      if (!user) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      const isSelf = user._id?.toString() === reqAdmin?.userId;
      const isSubordinate = reqAdmin
        ? checkRolePriority(reqAdmin.role, user.role) &&
          compareLocationOfReqAdminNewUserWarehouse(
            reqAdmin.role,
            reqAdmin.accessScope,
            user.accessScope
          )
        : false;

      const enrichedUser = {
        ...user,
        canEdit: isSelf || isSubordinate,
        canDelete:
          !isSelf && user.role !== SuperAdmin.SUPER_ADMIN && isSubordinate,
        canToggleStatus: !isSelf && isSubordinate,
      };

      this.logger.info(`Admin User fetched successfully: ${userId}`);
      return { user: enrichedUser };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetAdminUserUseCase,
        this.logger
      );
    }
  };
}
