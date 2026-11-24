import { injectable } from "tsyringe";
import { HsnCode, HsnCodeModel } from "@/domain/entities/admin/HsnCode";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class HsnCodeRepository {
  async createHsnCode(
    data: Partial<HsnCode>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await HsnCodeModel.create([data], { session });
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
        if (error.keyPattern?.hsnCode) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.HSN_CODE_ALREADY_EXISTS,
            ERROR_CODES.HSN_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[HSN CODE REPOSITORY]: Error creating HsnCode: ${error}`);
    }
  }

  async updateHsnCode(
    id: string | Types.ObjectId,
    data: Partial<HsnCode>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await HsnCodeModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.HSN_CODE_NOT_FOUND,
          ERROR_CODES.HSN_CODE_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.hsnCode) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.HSN_CODE_ALREADY_EXISTS,
            ERROR_CODES.HSN_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[HSN CODE REPOSITORY]: Error updating HsnCode: ${error}`);
    }
  }

  async deleteHsnCode(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await HsnCodeModel.findOneAndUpdate(
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
        ERROR_MESSAGES.HSN_CODE_NOT_FOUND,
        ERROR_CODES.HSN_CODE_NOT_FOUND
      );
    }
    return updated;
  }

  async getHsnCodeById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await HsnCodeModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getHsnCodeByCode(hsnCode: string) {
    return await HsnCodeModel.findOne({ hsnCode: hsnCode.trim(), isDeleted: false }).lean();
  }

  async getHsnCodeList(query: any = {}, page: number = 1, limit: number = 20) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;

    return await HsnCodeModel.find(finalQuery)
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countHsnCodes(query: any = {}) {
    const finalQuery = { ...query, isDeleted: false };
    return await HsnCodeModel.countDocuments(finalQuery);
  }

  async getAllActiveHsnCodes() {
    return await HsnCodeModel.find({ isDeleted: false, isActive: true })
      .select("_id hsnCode description gstRate isActive")
      .sort({ hsnCode: 1 })
      .lean();
  }
}
