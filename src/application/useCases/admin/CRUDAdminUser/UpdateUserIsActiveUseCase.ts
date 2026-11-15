import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
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
