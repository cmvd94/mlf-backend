import { injectable } from "tsyringe";
import { Godown, GodownModel } from "@/domain/entities/admin/Godown";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId, generateObjectIdsList } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class GodownRepository {
  async createGodown(
    data: Partial<Godown>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await GodownModel.create([data], { session });
      if (!created || created.length === 0) {
        throw new HttpException(
          500,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }
      return created[0]._id;
    } catch (error: any) {
      if (error?.code === 11000) {
        const keyPattern = error.keyPattern;
        if (keyPattern?.godownId) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.GODOWN_ID_ALREADY_EXISTS,
            ERROR_CODES.GODOWN_ID_ALREADY_EXISTS
          );
        }
        if (keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.GODOWN_NAME_ALREADY_EXISTS,
            ERROR_CODES.GODOWN_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to create godown document. Error: ${error}`
      );
    }
  }

  async updateGodown(
    id: string | Types.ObjectId,
    data: Partial<Godown>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await GodownModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.GODOWN_NOT_FOUND,
          ERROR_CODES.GODOWN_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        const keyPattern = error.keyPattern;
        if (keyPattern?.godownId) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.GODOWN_ID_ALREADY_EXISTS,
            ERROR_CODES.GODOWN_ID_ALREADY_EXISTS
          );
        }
        if (keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.GODOWN_NAME_ALREADY_EXISTS,
            ERROR_CODES.GODOWN_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to update godown document. Error: ${error}`
      );
    }
  }

  async findGodownById(id: string | Types.ObjectId): Promise<Godown | null> {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      return await GodownModel.findOne({
        _id: objectId,
        isDeleted: false,
      })
        .lean()
        .exec();
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to find godown by ID. Error: ${error}`
      );
    }
  }

  async findGodownByIds(ids: Types.ObjectId[]): Promise<Godown[]> {
    try {
      return await GodownModel.find({
        _id: { $in: ids },
        isDeleted: false,
      })
        .lean()
        .exec();
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to find godowns by IDs. Error: ${error}`
      );
    }
  }

  async findGodownByIdPopulated(id: string | Types.ObjectId) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const result = await GodownModel.aggregate([
        {
          $match: {
            _id: objectId,
            isDeleted: false,
          },
        },
        // Populate Godown Manager
        {
          $lookup: {
            from: "admins",
            localField: "godownManagerId",
            foreignField: "_id",
            as: "godownManager",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Populate Supervisors
        {
          $lookup: {
            from: "admins",
            localField: "supervisorId",
            foreignField: "_id",
            as: "supervisor",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Populate Assistants
        {
          $lookup: {
            from: "admins",
            localField: "assistantId",
            foreignField: "_id",
            as: "assistant",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Populate Billing User
        {
          $lookup: {
            from: "admins",
            localField: "billingUserId",
            foreignField: "_id",
            as: "billingUser",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Populate Created By
        {
          $lookup: {
            from: "admins",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByDetails",
            pipeline: [{ $project: { name: 1, employeeId: 1 } }],
          },
        },
        // Populate Updated By
        {
          $lookup: {
            from: "admins",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedByDetails",
            pipeline: [{ $project: { name: 1, employeeId: 1 } }],
          },
        },
        {
          $addFields: {
            godownManager: { $arrayElemAt: ["$godownManager", 0] },
            billingUser: { $arrayElemAt: ["$billingUser", 0] },
            createdBy: { $arrayElemAt: ["$createdByDetails.name", 0] },
            updatedBy: { $arrayElemAt: ["$updatedByDetails.name", 0] },
          },
        },
        {
          $project: {
            createdByDetails: 0,
            updatedByDetails: 0,
          },
        },
      ]);

      return result[0] || null;
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to fetch populated godown by ID. Error: ${error}`
      );
    }
  }

  async countGodowns(query: any): Promise<number> {
    try {
      return await GodownModel.countDocuments({
        ...query,
        isDeleted: false,
      })
        .lean()
        .exec();
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to count godown documents. Error: ${error}`
      );
    }
  }

  async getGodownList(query: any, page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      return await GodownModel.aggregate([
        { $match: { ...query, isDeleted: false } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Lookup Godown Manager
        {
          $lookup: {
            from: "admins",
            localField: "godownManagerId",
            foreignField: "_id",
            as: "godownManager",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Lookup Supervisors
        {
          $lookup: {
            from: "admins",
            localField: "supervisorId",
            foreignField: "_id",
            as: "supervisor",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Lookup Assistants
        {
          $lookup: {
            from: "admins",
            localField: "assistantId",
            foreignField: "_id",
            as: "assistant",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Lookup Billing User
        {
          $lookup: {
            from: "admins",
            localField: "billingUserId",
            foreignField: "_id",
            as: "billingUser",
            pipeline: [
              {
                $project: {
                  name: 1,
                  employeeId: 1,
                  phoneNumber: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
          },
        },
        // Lookup Created By
        {
          $lookup: {
            from: "admins",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByDetails",
            pipeline: [{ $project: { name: 1, employeeId: 1 } }],
          },
        },
        {
          $addFields: {
            godownManager: { $arrayElemAt: ["$godownManager", 0] },
            billingUser: { $arrayElemAt: ["$billingUser", 0] },
            createdBy: { $arrayElemAt: ["$createdByDetails.name", 0] },
          },
        },
        {
          $project: {
            createdByDetails: 0,
          },
        },
      ]);
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to fetch godown list. Error: ${error}`
      );
    }
  }

  async updateGodownIsActive(
    ids: string[],
    isActive: boolean,
    updatedBy: Types.ObjectId
  ) {
    try {
      const objectIds = generateObjectIdsList(ids);
      await GodownModel.updateMany(
        { _id: { $in: objectIds }, isDeleted: false },
        { $set: { isActive, updatedBy } }
      );
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to update godown active status. Error: ${error}`
      );
    }
  }

  async softDeleteGodowns(
    ids: Types.ObjectId[],
    deletedBy: Types.ObjectId,
    session?: ClientSession
  ) {
    try {
      const result = await GodownModel.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
            isActive: false,
          },
        },
        { session }
      );
      if (result.modifiedCount !== ids.length) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_DELETE_FAILED,
          ERROR_CODES.GODOWN_DELETE_FAILED
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to soft delete godown. Error: ${error}`
      );
    }
  }

  async getAllGodownsByQuery(query: any = {}) {
    try {
      return await GodownModel.find({ ...query, isDeleted: false })
        .select("_id godownId name type country zone state district pincode isActive")
        .sort({ name: 1 })
        .lean();
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to fetch godowns by query: ${error}`
      );
    }
  }

  async getGodownIdsByQuery(query: any = {}): Promise<Types.ObjectId[]> {
    try {
      const godowns = await GodownModel.find({ ...query, isDeleted: false })
        .select("_id")
        .lean();
      return godowns.map((g: any) => g._id as Types.ObjectId);
    } catch (error) {
      throw new Error(
        `[GODOWN REPOSITORY]: Failed to fetch godown IDs by query: ${error}`
      );
    }
  }
}
