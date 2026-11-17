import { Request, Response, NextFunction } from "express";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";

export function adminRoleGuard(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.admin?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(
        new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE,
          AdminErrorStage.AdminRoleGuard
        )
      );
    }

    next();
  };
}
