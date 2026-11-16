import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import {
  ERROR_MESSAGES,
  ERROR_CODES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { UpdateAdminUserDTO } from "@/shared/dto/admin/crudUserDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import HttpException from "@/shared/exceptions/HttpException";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { isValidRole } from "@/shared/utils/adminRoleValidation";
import { cleanObject } from "@/shared/utils/cleanObject";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { Types } from "mongoose";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject(AdminSessionRepository)
    private adminSessionRepository: AdminSessionRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (
    userId: string,
    updateData: UpdateAdminUserDTO,
    reqAdmin: ReqAdminDTO
  ) => {
    try {
      const userBeforeUpdate = await this.adminRepository.findUserById(userId);
      if (!userBeforeUpdate) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      const isSelf = userId === reqAdmin.userId;

      if (!isSelf && !checkRolePriority(reqAdmin.role, userBeforeUpdate.role)) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
        );
      }

      if (updateData?.role) {
        if (!isValidRole(updateData.role)) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.ADMIN_ROLE_INVALID,
            ERROR_CODES.ADMIN_ROLE_INVALID
          );
        }

        if (isSelf && updateData.role !== userBeforeUpdate.role) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE,
            ERROR_CODES.CANNOT_CHANGE_OWN_ROLE
          );
        }

        if (!isSelf && !checkRolePriority(reqAdmin.role, updateData.role)) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
            ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
          );
        }
      }

      const cleanUpdateData = cleanObject(updateData);
      if (Object.keys(cleanUpdateData).length === 0) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
          ERROR_CODES.NO_FIELDS_TO_UPDATE
        );
      }

      const updatedAdmin = await this.adminRepository.updateAdminById(
        userId,
        cleanUpdateData,
        new Types.ObjectId(reqAdmin.userId)
      );

      await this.adminSessionRepository.removeAllSessions(
        generateObjectId(userId)
      );

      this.logger.info(
        `Admin User updated successfully: id:${updatedAdmin?._id} role: ${updatedAdmin?.role}, updatedBy: ${reqAdmin.userId}`
      );
      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.UpdateAdminUserUseCase,
        this.logger
      );
    }
  };
}
