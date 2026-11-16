import i18n from "@/config/i18n";
import { Request } from "express";
import { Logger } from "winston";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";

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
  // Try translating ERRORS.<errCode> first
  const keyPhrase = `ERRORS.${errCode}`;
  let translated = translateMessage(req, keyPhrase, values);

  // If translation was not found (i18n returns the key verbatim)
  if (translated === keyPhrase) {
    translated = translateMessage(req, message, values);
    if (
      translated === message &&
      (ERROR_MESSAGES as Record<string, string>)[errCode]
    ) {
      translated = (ERROR_MESSAGES as Record<string, string>)[errCode];
    }
  }

  const finalMessage = translated || message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  const errorResponse = {
    success: false as const,
    message: finalMessage,
    status,
    errCode: errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
  };

  logger.error(
    `[ERROR] Status: ${status}, Code: ${errorResponse.errCode}, Message: ${errorResponse.message}`
  );
  return errorResponse;
};
