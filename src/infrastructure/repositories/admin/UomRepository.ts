import { injectable } from "tsyringe";
import { UnitOfMeasurement, UnitOfMeasurementModel } from "@/domain/entities/admin/UnitOfMeasurement";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class UomRepository {
  async createUom(
    data: Partial<UnitOfMeasurement>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await UnitOfMeasurementModel.create([data], { session });
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
        if (error.keyPattern?.symbol) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.UOM_SYMBOL_ALREADY_EXISTS,
            ERROR_CODES.UOM_SYMBOL_ALREADY_EXISTS
          );
        }
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.UOM_NAME_ALREADY_EXISTS,
            ERROR_CODES.UOM_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[UOM REPOSITORY]: Error creating UOM: ${error}`);
    }
  }

  async updateUom(
    id: string | Types.ObjectId,
    data: Partial<UnitOfMeasurement>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await UnitOfMeasurementModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.UOM_NOT_FOUND,
          ERROR_CODES.UOM_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.symbol) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.UOM_SYMBOL_ALREADY_EXISTS,
            ERROR_CODES.UOM_SYMBOL_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[UOM REPOSITORY]: Error updating UOM: ${error}`);
    }
  }

  async deleteUom(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await UnitOfMeasurementModel.findOneAndUpdate(
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
        ERROR_MESSAGES.UOM_NOT_FOUND,
        ERROR_CODES.UOM_NOT_FOUND
      );
    }
    return updated;
  }

  async getUomById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await UnitOfMeasurementModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getUomList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await UnitOfMeasurementModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countUoms(query: any = {}): Promise<number> {
    return await UnitOfMeasurementModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActiveUoms() {
    return await UnitOfMeasurementModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}
