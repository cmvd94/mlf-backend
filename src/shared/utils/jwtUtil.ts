import jwt from "jsonwebtoken";
import { Logger } from "winston";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";

const JWT_SECRET = process.env.JWT_SECRET || "mlf-secret-token-key-2026";
const TOKEN_EXPIRATION = (process.env.JWT_EXPIRES_IN || "6h") as jwt.SignOptions["expiresIn"];
const TOKEN_EXPIRATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export const generateToken = (
  payload: object,
  logger: Logger
): { token: string; expiresAt: Date } => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);
    logger.info("JWT token generated successfully (expires in 6 hours)");
    return { token, expiresAt };
  } catch (error) {
    logger.error(`Failed to generate JWT token: ${error}`);
    throw new HttpException(
      500,
      "Failed to generate token",
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

export const verifyToken = (token: string, logger: Logger): any => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error(`Failed to verify JWT token: ${error}`);
    throw new HttpException(
      401,
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED
    );
  }
};
