import { Response, NextFunction, Request } from "express";
import HttpException from "../exceptions/HttpException";
import { sendError } from "./responseUtil";
import { Logger } from "winston";
import { ERROR_CODES, ERROR_MESSAGES } from "../constants/errorCodesMessages";

export const sendErrorResponse = (
  req: Request,
  res: Response,
  next: NextFunction,
  error: HttpException | unknown,
  stage: string,
  logger: Logger
) => {
  if (error instanceof HttpException) {
    res
      .status(error.status)
      .json(
        sendError(
          req,
          `ERRORS.${error.errCode}`,
          error.status,
          error.errCode,
          logger,
          error.dynamicValues
        )
      );
  } else {
    const errMessage =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    throw new HttpException(
      500,
      errMessage,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      stage,
      logger
    );
  }
};
