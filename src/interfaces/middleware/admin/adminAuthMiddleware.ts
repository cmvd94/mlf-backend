import { adminLogger } from "@/infrastructure/logger";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import {
  ERROR_MESSAGES,
  ERROR_CODES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { verifyToken } from "@/shared/utils/jwtUtil";
import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";

export const authenticateTokenAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const adminSessionRepository = container.resolve(AdminSessionRepository);
  const adminRepository = container.resolve(AdminRepository);
  let token;
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      throw new HttpException(
        400,
        ERROR_MESSAGES.UNEXPECTED_AUTH_HEADER,
        ERROR_CODES.UNEXPECTED_AUTH_HEADER,
        AdminErrorStage.AdminAuthMiddleware,
        adminLogger
      );
    }
    token = authHeader.split(" ")[1];
    if (!token) {
      throw new HttpException(
        401,
        ERROR_MESSAGES.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        AdminErrorStage.AdminAuthMiddleware,
        adminLogger
      );
    }
    const decoded = verifyToken(token, adminLogger);

    const session = await adminSessionRepository.findSessionByUserIddeviceId(
      decoded.userId,
      decoded.deviceId
    );

    if (!session) {
      throw new HttpException(
        401,
        ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED,
        ERROR_CODES.UNAUTHORIZED,
        AdminErrorStage.AdminAuthMiddleware,
        adminLogger
      );
    }

    const user = await adminRepository.findUserById(decoded.userId);
    if (!user) {
      throw new HttpException(
        401,
        ERROR_MESSAGES.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        AdminErrorStage.AdminAuthMiddleware,
        adminLogger
      );
    }

    if (!user?.isActive) {
      throw new HttpException(
        403,
        ERROR_MESSAGES.ACCOUNT_DISABLED,
        ERROR_CODES.ACCOUNT_DISABLED,
        AdminErrorStage.AdminAuthMiddleware,
        adminLogger
      );
    }

    req.admin = {
      userId: decoded.userId,
      role: decoded.role || user.role,
      deviceId: decoded.deviceId,
      name: user.name,
      accessScope: user.accessScope,
      godownId: (user.godownId || []).map((id: any) => id.toString()),
    };

    next();
  } catch (error) {
    if (
      error instanceof HttpException &&
      (error.errCode === ERROR_CODES.UNAUTHORIZED ||
        error.errCode === ERROR_CODES.ACCOUNT_DISABLED)
    ) {
      adminLogger.info("authenticateTokenAdmin: Unauthorized access attempt");

      if (token) {
        const session = await adminSessionRepository.findSessionByJwtToken(token);
        if (session) {
          await adminSessionRepository.removeAllExpiredTokenById(
            session.userId.toString()
          );
        }
      }
    }

    next(error);
  }
};
