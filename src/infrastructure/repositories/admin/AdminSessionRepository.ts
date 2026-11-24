import {
  AdminSession,
  AdminSessionModel,
} from "@/domain/entities/admin/AdminSession";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";
import { injectable } from "tsyringe";

@injectable()
export class AdminSessionRepository {
  createAdminSession = async (sessionData: Partial<AdminSession>) => {
    try {
      const newSession = await AdminSessionModel.create(sessionData);
      if (!newSession) {
        throw new HttpException(
          500,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }
      return newSession;
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to create Admin session document. Error object: ${error}`
      );
    }
  };

  findSessionByUserId = async (userId: string) => {
    try {
      const session = await AdminSessionModel.findOne({ userId }).exec();
      return session;
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to find Admin session document by userId. Error object: ${error}`
      );
    }
  };

  pushSessionDetails = async (userId: string, sessionDetails: any) => {
    try {
      const updatedSession = await AdminSessionModel.findOneAndUpdate(
        { userId },
        { $push: { validSessions: sessionDetails } },
        { new: true }
      ).exec();

      if (!updatedSession) {
        throw new HttpException(
          500,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }

      return updatedSession;
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to push Admin session details. Error object: ${error}`
      );
    }
  };

  removeSessionByDeviceId = async (userId: string, deviceId: string) => {
    try {
      const result = await AdminSessionModel.findOneAndUpdate(
        { userId },
        { $pull: { validSessions: { deviceId } } },
        { new: true }
      ).exec();

      if (!result) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.NOT_FOUND,
          ERROR_CODES.NOT_FOUND
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to remove Admin session document by ID. Error object: ${error}`
      );
    }
  };

  removeAllSessions = async (
    userId: Types.ObjectId | string,
    session?: ClientSession
  ) => {
    try {
      const userObjectId =
        typeof userId === "string" ? generateObjectId(userId) : userId;
      const query = {
        $or: [
          ...(userObjectId ? [{ userId: userObjectId }] : []),
          { userId: userId.toString() },
        ],
      };
      await AdminSessionModel.deleteMany(
        query,
        session ? { session } : {}
      ).exec();
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to remove all Admin session documents. Error object: ${error}`
      );
    }
  };

  findSessionByUserIddeviceId = async (userId: string, deviceId: string) => {
    try {
      const result = await AdminSessionModel.findOne({
        userId: userId,
        "validSessions.deviceId": deviceId,
      });
      return result;
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to find session document by userID & deviceId. Error object: ${error}`
      );
    }
  };

  findSessionByJwtToken = async (jwtToken: string) => {
    try {
      const result = await AdminSessionModel.findOne({
        "validSessions.jwtToken": jwtToken,
      });
      return result;
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to find session document by token. Error object: ${error}`
      );
    }
  };

  removeAllExpiredTokenById = async (userId: string) => {
    try {
      await AdminSessionModel.updateOne(
        { userId: userId },
        {
          $pull: {
            validSessions: {
              expiresAt: { $lt: new Date() },
            },
          },
        }
      );
    } catch (error) {
      throw new Error(
        `[Admin Session REPOSITORY]: Failed to remove all expired tokens. Error object: ${error}`
      );
    }
  };
}
