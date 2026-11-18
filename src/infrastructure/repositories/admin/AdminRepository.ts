import { AdminModel } from "@/domain/entities/admin/Admin";
import { role } from "@/shared/constants/adminRole";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { UpdateAdminUserDTO } from "@/shared/dto/admin/crudUserDTO";
import HttpException from "@/shared/exceptions/HttpException";
import { Types, ClientSession } from "mongoose";
import { injectable } from "tsyringe";
import { generateObjectId } from "@/shared/utils/generateObjectId";

@injectable()
export class AdminRepository {
  findUserByRole = async (role: role) => {
    try {
      const user = await AdminModel.findOne({ role }).exec();
      return user;
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to find user document by Role. Error object: ${error}`
      );
    }
  };

  findUserByPhoneNumberIsDeleted = async (phoneNumber: string) => {
    try {
      const phoneNumberExists = await AdminModel.findOne({
        phoneNumber,
        isDeleted: false,
      }).exec();
      return phoneNumberExists;
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to find user document by Phone Number. Error object: ${error}`
      );
    }
  };

  createAdminUser = async (user: Partial<InstanceType<typeof AdminModel>>) => {
    try {
      const newUser = await AdminModel.create(user);
      if (!newUser) {
        throw new HttpException(
          500,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }
      return newUser;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if ((error as any).code === 11000) {
          const keyPattern = (error as any).keyPattern;
          if (keyPattern?.employeeId) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.EMPLOYEEID_ALREADY_EXISTS,
              ERROR_CODES.EMPLOYEEID_ALREADY_EXISTS
            );
          }
          if (keyPattern?.email) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
              ERROR_CODES.EMAIL_ALREADY_EXISTS
            );
          }
          if (keyPattern?.phoneNumber) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.PHONE_NUMBER_ALREADY_EXISTS,
              ERROR_CODES.PHONE_NUMBER_ALREADY_EXISTS
            );
          }
        }
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to create user document. Error object: ${error}`
      );
    }
  };

  findUserById = async (userId: string) => {
    try {
      const user = await AdminModel.findOne({
        _id: generateObjectId(userId),
        isDeleted: false,
      })
        .lean()
        .exec();
      return user;
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to find user document by _id. Error object: ${error}`
      );
    }
  };

  updateAdminById = async (
    userId: string,
    updateData: Partial<UpdateAdminUserDTO>,
    updatedBy: Types.ObjectId
  ) => {
    try {
      const updatedUser = await AdminModel.findOneAndUpdate(
        { _id: generateObjectId(userId), isDeleted: false },
        { $set: { ...updateData, updatedBy } },
        { new: true }
      ).lean();
      if (!updatedUser) {
        throw new HttpException(
          500,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 11000) {
          const keyPattern = (error as any).keyPattern;
          if (keyPattern?.employeeId) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.EMPLOYEEID_ALREADY_EXISTS,
              ERROR_CODES.EMPLOYEEID_ALREADY_EXISTS
            );
          }
          if (keyPattern?.email) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
              ERROR_CODES.EMAIL_ALREADY_EXISTS
            );
          }
          if (keyPattern?.phoneNumber) {
            throw new HttpException(
              409,
              ERROR_MESSAGES.PHONE_NUMBER_ALREADY_EXISTS,
              ERROR_CODES.PHONE_NUMBER_ALREADY_EXISTS
            );
          }
        }
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to update user document by _id. Error object: ${error}`
      );
    }
  };

  updatePassword = async (
    userId: string,
    password: string,
    updatedBy: Types.ObjectId,
    session?: ClientSession
  ) => {
    try {
      const updatedUser = await AdminModel.findOneAndUpdate(
        { _id: generateObjectId(userId), isDeleted: false },
        { $set: { password, updatedBy } },
        { new: true, session }
      ).exec();
      if (!updatedUser) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to update password. Error: ${error}`
      );
    }
  };

  getUserList = async (query: any, page: number, limit: number) => {
    try {
      const skip = (page - 1) * limit;

      const userList = await AdminModel.aggregate([
        { $match: query },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "admins",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $lookup: {
            from: "admins",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedBy",
          },
        },
        {
          $addFields: {
            createdBy: { $arrayElemAt: ["$createdBy.name", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy.name", 0] },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            role: 1,
            employeeId: 1,
            phoneNumber: 1,
            isActive: 1,
            accessScope: 1,
            godownId: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);
      return userList;
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to fetch user list document. Error object: ${error}`
      );
    }
  };

  countUsers = async (query: any) => {
    try {
      return await AdminModel.countDocuments(query);
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to count user documents. Error: ${error}`
      );
    }
  };

  findUsersByIds = async (userIds: Types.ObjectId[]) => {
    try {
      const availableUsers = await AdminModel.find({
        _id: { $in: userIds },
        isDeleted: false,
      });
      return availableUsers;
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to find user documents by _id. Error object: ${error}`
      );
    }
  };

  softDeleteAdmin = async (
    adminId: Types.ObjectId,
    deletedBy: Types.ObjectId,
    session?: ClientSession
  ) => {
    try {
      const updatedAdmin = await AdminModel.findByIdAndUpdate(
        { _id: adminId, isDeleted: false },
        {
          $set: {
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: deletedBy,
          },
        },
        { new: true, session }
      ).exec();

      if (!updatedAdmin) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.USER_NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to soft delete admin. Error object: ${error}`
      );
    }
  };

  updateIsActiveUser = async (
    userIds: Types.ObjectId[],
    isActive: boolean,
    session?: ClientSession
  ) => {
    try {
      return await AdminModel.updateMany(
        { _id: { $in: userIds }, isDeleted: false },
        { isActive },
        { session }
      );
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to update isActive of user. Error object: ${error}`
      );
    }
  };

  updateAdminForGodown = async (
    adminIds: Types.ObjectId[],
    updateData: any,
    session?: ClientSession
  ) => {
    try {
      return await AdminModel.updateMany(
        { _id: { $in: adminIds }, isDeleted: false },
        updateData,
        { session }
      ).exec();
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to update user document for godown. Error object: ${error}`
      );
    }
  };

  removeGodownFromAllAdmins = async (
    godownId: Types.ObjectId,
    session?: ClientSession
  ) => {
    try {
      return await AdminModel.updateMany(
        { godownId: godownId },
        { $pull: { godownId: godownId } },
        { session }
      ).exec();
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to remove godownId from admins. Error object: ${error}`
      );
    }
  };

  findEligibleAdminsForGodown = async (query: any, limit = 100) => {
    try {
      return await AdminModel.find(query)
        .select("_id name employeeId role phoneNumber email accessScope")
        .limit(limit)
        .lean()
        .exec();
    } catch (error) {
      throw new Error(
        `[ADMIN REPOSITORY]: Failed to find eligible admins for godown. Error object: ${error}`
      );
    }
  };
}
