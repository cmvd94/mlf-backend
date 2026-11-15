import { Request, Response, NextFunction } from "express";
import { sendError } from "@/shared/utils/responseUtil";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";
import { commonLogger } from "@/infrastructure/logger";

const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  commonLogger.warn(`404 Not Found - ${req.method} ${req.originalUrl}`);
  res
    .status(404)
    .json(
      sendError(
        req,
        ERROR_MESSAGES.API_NOT_FOUND,
        404,
        ERROR_CODES.NOT_FOUND,
        commonLogger
      )
    );
};

export default notFoundMiddleware;
