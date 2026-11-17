import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";
import { Logger } from "winston";

export class ErrorHandler {
  static handleError(error: unknown, operation: string, logger: Logger): void {
    if (error instanceof HttpException) {
      logger.error(`[${operation}]: ${error.message}`);
      throw error;
    } else if (error instanceof Error) {
      logger.error(`[${operation}]: ${error.message}`);
      throw new HttpException(
        500,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    } else {
      logger.error(`[${operation}]: An unknown error occurred`);
      throw new HttpException(
        500,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static handleValidationError(errors: string[]): void {
    const errorMessage = errors.join(", ");
    throw new HttpException(400, errorMessage, ERROR_CODES.VALIDATION_ERROR);
  }

  static handleUnauthorizedError(
    message: string = "Unauthorized access"
  ): void {
    throw new HttpException(401, message, ERROR_CODES.UNAUTHORIZED);
  }

  static handleNotFoundError(message: string = "Resource not found"): void {
    throw new HttpException(404, message, ERROR_CODES.NOT_FOUND);
  }
}
