import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { withTransaction } from "@/shared/utils/withTransaction";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import { DeleteAdminDTO } from "@/shared/dto/admin/crudUserDTO";
import { Admin } from "@/domain/entities/admin/Admin";
import { GodownModel } from "@/domain/entities/admin/Godown";

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject(AdminSessionRepository)
    private adminSessionRepository: AdminSessionRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (params: DeleteAdminDTO, reqAdmin: ReqAdminDTO) => {
    try {
      if (reqAdmin.role !== SuperAdmin.SUPER_ADMIN) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
        );
      }
      const userObjectId = generateObjectId(params.userId);
      const reqAdminObjectId = generateObjectId(reqAdmin.userId);

      if (!userObjectId || !reqAdminObjectId) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ID,
          ERROR_CODES.INVALID_ID
        );
      }

      const userToDelete = await this.validateAndGetUser(params.userId);

      this.validateDeletionPermissions(
        params.userId,
        reqAdmin,
        userToDelete
      );

      const isAssignedToGodown =
        Boolean(
          (userToDelete.godownId && userToDelete.godownId.length > 0) ||
          (userToDelete.accessScope?.pincode && userToDelete.accessScope.pincode.length > 0)
        ) ||
        Boolean(
          await GodownModel.exists({
            isDeleted: false,
            $or: [
              { godownManager: userObjectId },
              { billingUser: userObjectId },
              { supervisors: userObjectId },
              { assistants: userObjectId },
            ],
          })
        );

      if (isAssignedToGodown) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.USER_ASSIGNED_TO_GODOWN,
          ERROR_CODES.USER_ASSIGNED_TO_GODOWN
        );
      }

      await withTransaction(async (session) => {
        await this.adminRepository.softDeleteAdmin(
          userObjectId,
          reqAdminObjectId,
          session
        );

        await this.adminSessionRepository.removeAllSessions(userObjectId);
      });

      this.logger.info(
        `Admin user ${params.userId} soft deleted by ${reqAdmin.userId}`
      );

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.DeleteAdminUserUseCase,
        this.logger
      );
    }
  };

  private async validateAndGetUser(userId: string): Promise<Admin> {
    const userToDelete = await this.adminRepository.findUserById(userId);

    if (!userToDelete) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.USER_NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    if (userToDelete.isDeleted) {
      throw new HttpException(
        400,
        ERROR_MESSAGES.USER_ALREADY_DELETED,
        ERROR_CODES.USER_ALREADY_DELETED
      );
    }

    return userToDelete;
  }

  private validateDeletionPermissions(
    userId: string,
    reqAdmin: ReqAdminDTO,
    userToDelete: Admin
  ): void {
    if (userId === reqAdmin.userId) {
      throw new HttpException(
        403,
        ERROR_MESSAGES.CANNOT_DELETE_SELF,
        ERROR_CODES.CANNOT_DELETE_SELF
      );
    }

    if (userToDelete.role === SuperAdmin.SUPER_ADMIN) {
      throw new HttpException(
        403,
        ERROR_MESSAGES.CANNOT_DELETE_SUPER_ADMIN,
        ERROR_CODES.CANNOT_DELETE_SUPER_ADMIN
      );
    }

    if (!checkRolePriority(reqAdmin.role, userToDelete.role)) {
      throw new HttpException(
        403,
        ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
        ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
      );
    }

    if (
      !compareLocationOfReqAdminNewUserWarehouse(
        reqAdmin.role,
        reqAdmin.accessScope,
        userToDelete.accessScope
      )
    ) {
      throw new HttpException(
        400,
        ERROR_MESSAGES.DELETE_USER_ACCESS_SCOPE_NOT_MATCH,
        ERROR_CODES.DELETE_USER_ACCESS_SCOPE_NOT_MATCH
      );
    }
  }
}
