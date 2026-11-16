import { NextFunction, Request, Response } from "express";
import HttpException from "@/shared/exceptions/HttpException";
import { sendError } from "@/shared/utils/responseUtil";
import { Logger } from "winston";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";

const errorMiddleware =
  (logger: Logger) =>
  (
    error: HttpException,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const status: number = error.status || 500;
    const errCode: string = error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
    const message: string =
      error.message ||
      (ERROR_MESSAGES as Record<string, string>)[errCode] ||
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    const stage: string = error.stage || ERROR_MESSAGES.UNKNOWN;
    const customLogger: Logger = error.logger || logger;

    customLogger.error(
      `[${stage}] ${req.method} ${req.path} >> StatusCode:: ${status}, Message:: ${message}, ErrCode:: ${errCode}`
    );

    res
      .status(status)
      .json(
        sendError(
          req,
          message,
          status,
          errCode,
          customLogger,
          error.dynamicValues
        )
      );
  };

export default errorMiddleware;
