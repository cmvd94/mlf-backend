import { injectable } from "tsyringe";
import { SalesType, SalesTypeModel } from "@/domain/entities/admin/SalesType";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class SalesTypeRepository {
  async createSalesType(
    data: Partial<SalesType>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await SalesTypeModel.create([data], { session });
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
            ERROR_MESSAGES.SALES_TYPE_NAME_ALREADY_EXISTS,
            ERROR_CODES.SALES_TYPE_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[SALES TYPE REPOSITORY]: Error creating sales type: ${error}`);
    }
  }

  async updateSalesType(
    id: string | Types.ObjectId,
    data: Partial<SalesType>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await SalesTypeModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.SALES_TYPE_NOT_FOUND,
          ERROR_CODES.SALES_TYPE_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.SALES_TYPE_NAME_ALREADY_EXISTS,
            ERROR_CODES.SALES_TYPE_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[SALES TYPE REPOSITORY]: Error updating sales type: ${error}`);
    }
  }

  async deleteSalesType(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await SalesTypeModel.findOneAndUpdate(
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
        ERROR_MESSAGES.SALES_TYPE_NOT_FOUND,
        ERROR_CODES.SALES_TYPE_NOT_FOUND
      );
    }
    return updated;
  }

  async getSalesTypeById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await SalesTypeModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getSalesTypeList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await SalesTypeModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countSalesTypes(query: any = {}): Promise<number> {
    return await SalesTypeModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActiveSalesTypes() {
    return await SalesTypeModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}
