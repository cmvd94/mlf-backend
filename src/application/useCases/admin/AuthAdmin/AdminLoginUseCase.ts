import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { generateToken } from "@/shared/utils/jwtUtil";
import bcrypt from "bcryptjs";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class AdminLoginUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject(AdminSessionRepository)
    private adminSessionRepository: AdminSessionRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (phoneNumber: string, password: string) => {
    try {
      const user =
        await this.adminRepository.findUserByPhoneNumberIsDeleted(phoneNumber);

      if (!user) {
        throw new HttpException(
          400,
          "Invalid phone number or password",
          ERROR_CODES.INVALID_INPUT
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
          "Account password is not set. Please contact administrator.",
          ERROR_CODES.INVALID_INPUT
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new HttpException(
          400,
          "Invalid phone number or password",
          ERROR_CODES.INVALID_INPUT
        );
      }

      const deviceId = generateObjectId().toString();
      const { token } = generateToken(
        {
          userId: user._id.toString(),
          role: user.role,
          employeeId: user.employeeId,
          deviceId,
        },
        this.logger
      );

      const existingSession =
        await this.adminSessionRepository.findSessionByUserId(
          user._id.toString()
        );

      if (existingSession) {
        await this.adminSessionRepository.pushSessionDetails(
          user._id.toString(),
          { deviceId, jwtToken: token }
        );
      } else {
        await this.adminSessionRepository.createAdminSession({
          userId: user._id.toString(),
          validSessions: [{ deviceId, jwtToken: token }],
        });
      }

      this.logger.info(`Admin logged in successfully: ${user.phoneNumber}`);

      return {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          employeeId: user.employeeId,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.AdminLoginController,
        this.logger
      );
    }
  };
}
