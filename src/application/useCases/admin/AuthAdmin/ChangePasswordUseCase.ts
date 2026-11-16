import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { ChangePasswordDTO } from "@/shared/validation/admin/auth/ChangePasswordValidation";
import HttpException from "@/shared/exceptions/HttpException";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject(AdminSessionRepository)
    private adminSessionRepository: AdminSessionRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (userId: string, dto: ChangePasswordDTO) => {
    try {
      const user = await this.adminRepository.findUserById(userId);

      if (!user) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      if (!user.isActive) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.ACCOUNT_DISABLED,
          ERROR_CODES.ACCOUNT_DISABLED
        );
      }

      if (!user.password) {
        throw new HttpException(
          400,
          "Current password is not set on this account",
          ERROR_CODES.INVALID_INPUT
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        throw new HttpException(
          400,
          "Incorrect current password",
          ERROR_CODES.INVALID_INPUT
        );
      }

      const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

      await this.adminRepository.updatePassword(
        userId,
        hashedNewPassword,
        new Types.ObjectId(userId)
      );

      // Clean up previous sessions
      const userObjectId = generateObjectId(userId);
      if (userObjectId) {
        await this.adminSessionRepository.removeAllSessions(userObjectId);
      }

      this.logger.info(`Password successfully changed for admin: ${userId}`);

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.ChangePasswordUseCase,
        this.logger
      );
    }
  };
}
