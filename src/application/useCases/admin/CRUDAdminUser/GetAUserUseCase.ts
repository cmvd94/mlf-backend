import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { ERROR_MESSAGES, ERROR_CODES } from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
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

  execute = async (userId: string) => {
    try {
      const user = await this.adminRepository.findUserById(userId);

      if (!user) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      this.logger.info(`Admin User fetched successfully: ${userId}`);
      return { user };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetAdminUserUseCase,
        this.logger
      );
    }
  };
}
