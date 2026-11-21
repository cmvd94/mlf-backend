import { injectable } from "tsyringe";
import { StockTransfer, StockTransferModel } from "@/domain/entities/admin/StockTransfer";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class StockTransferRepository {
  async createStockTransfer(
    data: Partial<StockTransfer>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await StockTransferModel.create([data], { session });
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
        if (error.keyPattern?.transferNumber) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.TRANSFER_NUMBER_ALREADY_EXISTS,
            ERROR_CODES.TRANSFER_NUMBER_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[STOCK TRANSFER REPOSITORY]: Error creating StockTransfer: ${error}`);
    }
  }

  async getStockTransferById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await StockTransferModel.findOne({ _id: objectId, isDeleted: false })
      .populate("sourceItems.itemId", "name itemCode itemGroupId defaultUomId defaultPerId")
      .populate("sourceItems.godownId", "godownId name type country zone state district pincode")
      .populate("sourceItems.companyGodownId", "godownId name type country zone state district pincode")
      .populate("sourceItems.uomId", "name symbol")
      .populate("sourceItems.perId", "name symbol multiplier")
      .populate("destinationItems.itemId", "name itemCode itemGroupId defaultUomId defaultPerId")
      .populate("destinationItems.godownId", "godownId name type country zone state district pincode")
      .populate("destinationItems.companyGodownId", "godownId name type country zone state district pincode")
      .populate("destinationItems.uomId", "name symbol")
      .populate("destinationItems.perId", "name symbol multiplier")
      .populate("createdBy", "name phoneNumber")
      .lean();
  }

  async getStockTransferList(query: any = {}, page: number = 1, limit: number = 20) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;

    const [transfers, totalCount] = await Promise.all([
      StockTransferModel.find(finalQuery)
        .populate("sourceItems.itemId", "name itemCode")
        .populate("sourceItems.godownId", "godownId name type")
        .populate("sourceItems.companyGodownId", "godownId name type")
        .populate("sourceItems.uomId", "name symbol")
        .populate("destinationItems.itemId", "name itemCode")
        .populate("destinationItems.godownId", "godownId name type")
        .populate("destinationItems.companyGodownId", "godownId name type")
        .populate("destinationItems.uomId", "name symbol")
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockTransferModel.countDocuments(finalQuery),
    ]);

    return {
      transfers,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    };
  }

  async countStockTransfers(query: any = {}): Promise<number> {
    return await StockTransferModel.countDocuments({ ...query, isDeleted: false });
  }

  async updateStockTransfer(
    id: string | Types.ObjectId,
    data: any,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const updated = await StockTransferModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: data },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        "Stock transfer not found",
        ERROR_CODES.NOT_FOUND
      );
    }
    return updated;
  }

  async deleteStockTransfer(
    id: string | Types.ObjectId,
    adminId: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await StockTransferModel.findOneAndUpdate(
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
        "Stock transfer not found",
        ERROR_CODES.NOT_FOUND
      );
    }
    return updated;
  }
}
