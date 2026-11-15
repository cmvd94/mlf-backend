import i18n from "@/config/i18n";
import { Request } from "express";
import { Logger } from "winston";

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  status: number;
  errCode: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const translateMessage = (
  req: Request,
  phrase: string,
  values?: Record<string, any>
) => {
  const locale = i18n.getLocale(req);
  if (values) {
    return i18n.__({ phrase, locale }, values);
  } else {
    return i18n.__({ phrase, locale });
  }
};

export const sendResponse = <T>(
  req: Request,
  message: string,
  logger: Logger,
  data?: T
): ApiResponse<T> => {
  const translatedMessage = translateMessage(req, message);
  const response = {
    success: true as const,
    message: translatedMessage,
    data: data,
  };

  logger.debug(`[RESPONSE] Success: ${translatedMessage}`);
  return response;
};

export const sendError = (
  req: Request,
  message: string,
  status: number,
  errCode: string,
  logger: Logger,
  values?: Record<string, any>
): ApiErrorResponse => {
  const translatedMessage = translateMessage(req, message, values);
  const errorResponse = {
    success: false as const,
    message: translatedMessage,
    status,
    errCode,
  };

  logger.error(
    `[ERROR] Status: ${status}, Code: ${errCode}, Message: ${translatedMessage}`
  );
  return errorResponse;
};
