import { injectable } from "tsyringe";
import { PurchaseType, PurchaseTypeModel } from "@/domain/entities/admin/PurchaseType";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class PurchaseTypeRepository {
  async createPurchaseType(
    data: Partial<PurchaseType>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await PurchaseTypeModel.create([data], { session });
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
            ERROR_MESSAGES.PURCHASE_TYPE_NAME_ALREADY_EXISTS,
            ERROR_CODES.PURCHASE_TYPE_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PURCHASE TYPE REPOSITORY]: Error creating purchase type: ${error}`);
    }
  }

  async updatePurchaseType(
    id: string | Types.ObjectId,
    data: Partial<PurchaseType>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await PurchaseTypeModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND,
          ERROR_CODES.PURCHASE_TYPE_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PURCHASE_TYPE_NAME_ALREADY_EXISTS,
            ERROR_CODES.PURCHASE_TYPE_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PURCHASE TYPE REPOSITORY]: Error updating purchase type: ${error}`);
    }
  }

  async deletePurchaseType(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await PurchaseTypeModel.findOneAndUpdate(
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
        ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND,
        ERROR_CODES.PURCHASE_TYPE_NOT_FOUND
      );
    }
    return updated;
  }

  async getPurchaseTypeById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await PurchaseTypeModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getPurchaseTypeList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await PurchaseTypeModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countPurchaseTypes(query: any = {}): Promise<number> {
    return await PurchaseTypeModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActivePurchaseTypes() {
    return await PurchaseTypeModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}
