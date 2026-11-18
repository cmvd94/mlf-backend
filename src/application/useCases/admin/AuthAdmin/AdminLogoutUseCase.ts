import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import HttpException from "@/shared/exceptions/HttpException";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class AdminLogoutUseCase {
  constructor(
    @inject(AdminSessionRepository)
    private adminSessionRepository: AdminSessionRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  /**
   * Logout admin from current device
   */
  execute = async (reqAdmin: ReqAdminDTO) => {
    try {
      // Remove the session for the specific device
      await this.adminSessionRepository.removeSessionByDeviceId(
        reqAdmin.userId,
        reqAdmin.deviceId
      );

      // Clean up expired tokens
      await this.adminSessionRepository.removeAllExpiredTokenById(
        reqAdmin.userId
      );

      this.logger.info(
        `Admin logged out from device: ${reqAdmin.deviceId}, userId: ${reqAdmin.userId}`
      );

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.AdminLogoutUseCase,
        this.logger
      );
    }
  };

  /**
   * Logout admin from all devices
   */
  executeAll = async (reqAdmin: ReqAdminDTO) => {
    try {
      const adminObjectId = generateObjectId(reqAdmin.userId);
      if (!adminObjectId) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.ADMIN_NOT_FOUND,
          ERROR_CODES.ADMIN_NOT_FOUND
        );
      }

      // Remove all sessions for the admin
      await this.adminSessionRepository.removeAllSessions(adminObjectId);

      this.logger.info(`Admin logged out from all devices: ${reqAdmin.userId}`);

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.AdminLogoutAllUseCase,
        this.logger
      );
    }
  };
}
