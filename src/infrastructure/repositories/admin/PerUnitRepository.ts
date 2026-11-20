import { injectable } from "tsyringe";
import { PerUnit, PerUnitModel } from "@/domain/entities/admin/PerUnit";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class PerUnitRepository {
  async createPerUnit(
    data: Partial<PerUnit>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await PerUnitModel.create([data], { session });
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
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PER_UNIT_NAME_ALREADY_EXISTS,
            ERROR_CODES.PER_UNIT_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PER UNIT REPOSITORY]: Error creating PerUnit: ${error}`);
    }
  }

  async updatePerUnit(
    id: string | Types.ObjectId,
    data: Partial<PerUnit>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await PerUnitModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.PER_UNIT_NOT_FOUND,
          ERROR_CODES.PER_UNIT_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PER_UNIT_NAME_ALREADY_EXISTS,
            ERROR_CODES.PER_UNIT_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PER UNIT REPOSITORY]: Error updating PerUnit: ${error}`);
    }
  }

  async deletePerUnit(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await PerUnitModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminObjectId as any,
          isActive: false,
        },
      },
      { new: true }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.PER_UNIT_NOT_FOUND,
        ERROR_CODES.PER_UNIT_NOT_FOUND
      );
    }
    return updated;
  }

  async getPerUnitById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await PerUnitModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getPerUnitList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await PerUnitModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countPerUnits(query: any = {}): Promise<number> {
    return await PerUnitModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActivePerUnits() {
    return await PerUnitModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}
