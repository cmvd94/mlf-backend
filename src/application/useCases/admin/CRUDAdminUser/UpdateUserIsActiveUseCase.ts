import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { GodownModel } from "@/domain/entities/admin/Godown";
import { UpdateIsActiveUserDTO } from "@/shared/dto/admin/crudUserDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectIdsList } from "@/shared/utils/generateObjectId";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { withTransaction } from "@/shared/utils/withTransaction";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";

@injectable()
export class UpdateUserIsActiveUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (body: UpdateIsActiveUserDTO, reqAdmin: ReqAdminDTO) => {
    try {
      const userIds = generateObjectIdsList(body.userIds);
      const availableUsers = await this.adminRepository.findUsersByIds(userIds);

      if (availableUsers.length !== body.userIds.length) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      for (const targetUser of availableUsers) {
        if (targetUser._id.toString() === reqAdmin.userId) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.ADMIN_CANNOT_UPDATE_SELF,
            ERROR_CODES.ADMIN_CANNOT_UPDATE_SELF
          );
        }

        if (!checkRolePriority(reqAdmin.role, targetUser.role)) {
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
            targetUser.accessScope
          )
        ) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.UPDATE_USER_ACCESS_SCOPE_NOT_MATCH,
            ERROR_CODES.UPDATE_USER_ACCESS_SCOPE_NOT_MATCH
          );
        }

        if (!body.isActive) {
          const isAssignedToGodown =
            Boolean(
              (targetUser.godownId && targetUser.godownId.length > 0) ||
              (targetUser.accessScope?.pincode && targetUser.accessScope.pincode.length > 0)
            ) ||
            Boolean(
              await GodownModel.exists({
                isDeleted: false,
                $or: [
                  { godownManager: targetUser._id },
                  { billingUser: targetUser._id },
                  { supervisors: targetUser._id },
                  { assistants: targetUser._id },
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
        }
      }

      await withTransaction(async (session) => {
        await this.adminRepository.updateIsActiveUser(
          userIds,
          body.isActive,
          session
        );
      });

      this.logger.info(
        `User isActive updated successfully by ${reqAdmin.userId}`
      );

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.UpdateIsActiveUserUseCase,
        this.logger
      );
    }
  };
}
