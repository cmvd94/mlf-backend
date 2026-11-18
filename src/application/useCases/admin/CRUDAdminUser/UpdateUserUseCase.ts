import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import { GodownModel } from "@/domain/entities/admin/Godown";
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
import { validateAccessScope } from "@/shared/utils/accessScopeValidation";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
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

      // Check if user is assigned to any godown
      const userObjectId = generateObjectId(userId);
      const isAssignedToGodown =
        Boolean(
          (userBeforeUpdate.godownId && userBeforeUpdate.godownId.length > 0) ||
          (userBeforeUpdate.accessScope?.pincode && userBeforeUpdate.accessScope.pincode.length > 0)
        ) ||
        (userObjectId
          ? Boolean(
              await GodownModel.exists({
                isDeleted: false,
                $or: [
                  { godownManager: userObjectId },
                  { billingUser: userObjectId },
                  { supervisors: userObjectId },
                  { assistants: userObjectId },
                ],
              })
            )
          : false);

      if (isAssignedToGodown) {
        // Changing role is not allowed when assigned to godown
        if (updateData.role && updateData.role !== userBeforeUpdate.role) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.USER_ASSIGNED_TO_GODOWN,
            ERROR_CODES.USER_ASSIGNED_TO_GODOWN
          );
        }

        // Changing region (accessScope) is not allowed when assigned to godown
        if (updateData.accessScope) {
          const currentScope = userBeforeUpdate.accessScope || {};
          const isRegionChanged =
            (updateData.accessScope.country !== undefined &&
              (updateData.accessScope.country || "") !== (currentScope.country || "")) ||
            (updateData.accessScope.zone !== undefined &&
              (updateData.accessScope.zone || "") !== (currentScope.zone || "")) ||
            (updateData.accessScope.state !== undefined &&
              (updateData.accessScope.state || "") !== (currentScope.state || "")) ||
            (updateData.accessScope.district !== undefined &&
              (updateData.accessScope.district || "") !== (currentScope.district || ""));

          if (isRegionChanged) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.USER_ASSIGNED_TO_GODOWN,
              ERROR_CODES.USER_ASSIGNED_TO_GODOWN
            );
          }
        }
      }

      if (updateData.accessScope) {
        if (!isSelf && !checkRolePriority(reqAdmin.role, updateData.role || userBeforeUpdate.role)) {
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
            updateData.accessScope
          )
        ) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.UPDATE_USER_ACCESS_SCOPE_NOT_MATCH,
            ERROR_CODES.UPDATE_USER_ACCESS_SCOPE_NOT_MATCH
          );
        }
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

      // If role is updated, access scope is required
      if (updateData.role && !updateData.accessScope) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }

      if (updateData.role && updateData.accessScope) {
        validateAccessScope(updateData.role, updateData.accessScope);
      }

      // Update access scope of admin user without change in role
      if (updateData.accessScope && !updateData.role) {
        validateAccessScope(userBeforeUpdate.role, updateData.accessScope);
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
