import { injectable } from "tsyringe";
import { Purchase, PurchaseModel } from "@/domain/entities/admin/Purchase";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class PurchaseRepository {
  async createPurchase(
    data: Partial<Purchase>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await PurchaseModel.create([data], { session });
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
        if (error.keyPattern?.purchaseNumber) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PURCHASE_NUMBER_ALREADY_EXISTS,
            ERROR_CODES.PURCHASE_NUMBER_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PURCHASE REPOSITORY]: Error creating Purchase: ${error}`);
    }
  }

  async updatePurchase(
    id: string | Types.ObjectId,
    data: Partial<Purchase>,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const updated = await PurchaseModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: data },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.PURCHASE_NOT_FOUND,
        ERROR_CODES.PURCHASE_NOT_FOUND
      );
    }
    return updated;
  }

  async deletePurchase(
    id: string | Types.ObjectId,
    adminId: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await PurchaseModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminObjectId as any,
          isActive: false,
        },
      },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.PURCHASE_NOT_FOUND,
        ERROR_CODES.PURCHASE_NOT_FOUND
      );
    }
    return updated;
  }

  async getPurchaseById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await PurchaseModel.findOne({ _id: objectId, isDeleted: false })
      .populate("partyId")
      .populate("purchaseTypeId")
      .populate("items.itemId")
      .populate("items.godownId", "godownId name type country zone state district pincode")
      .populate("items.uomId")
      .populate("items.perId")
      .populate("itemId")
      .populate("uomId")
      .populate("perId")
      .populate("godownId", "godownId name type country zone state district pincode")
      .populate("createdBy", "name phoneNumber")
      .lean();
  }

  async getPurchaseList(query: any = {}, page: number = 1, limit: number = 20) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await PurchaseModel.find(finalQuery)
      .populate("partyId", "name partyCode")
      .populate("purchaseTypeId", "name code")
      .populate("items.itemId", "name itemCode currentStock")
      .populate("items.godownId", "godownId name type country zone state district pincode")
      .populate("items.uomId", "name symbol")
      .populate("items.perId", "name symbol multiplier")
      .populate("itemId", "name itemCode currentStock")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .populate("godownId", "godownId name type country zone state district pincode")
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countPurchases(query: any = {}): Promise<number> {
    return await PurchaseModel.countDocuments({ ...query, isDeleted: false });
  }
}
