import { injectable } from "tsyringe";
import { Sale, SaleModel } from "@/domain/entities/admin/Sale";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class SaleRepository {
  async createSale(
    data: Partial<Sale>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await SaleModel.create([data], { session });
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
        if (error.keyPattern?.salesNumber) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.SALES_NUMBER_ALREADY_EXISTS,
            ERROR_CODES.SALES_NUMBER_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[SALE REPOSITORY]: Error creating Sale: ${error}`);
    }
  }

  async getSaleById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await SaleModel.findOne({ _id: objectId, isDeleted: false })
      .populate("salesTypeId", "name code")
      .populate("partyId")
      .populate("companyGodownId", "godownId name type country zone state district pincode")
      .populate("items.itemId", "name itemCode itemGroupId defaultUomId defaultPerId")
      .populate("items.godownId", "godownId name type country zone state district pincode")
      .populate("items.companyGodownId", "godownId name type country zone state district pincode")
      .populate("items.uomId", "name symbol")
      .populate("items.perId", "name symbol multiplier")
      .populate("items.godownStockId", "dcNo lotNo currentStock uomQuantity rate")
      .populate("createdBy", "name phoneNumber")
      .populate("updatedBy", "name phoneNumber")
      .lean();
  }

  async getSaleList(query: any = {}, page: number = 1, limit: number = 20) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;

    const [sales, totalCount] = await Promise.all([
      SaleModel.find(finalQuery)
        .populate("salesTypeId", "name code")
        .populate("partyId", "name partyCode phoneNumber email")
        .populate("companyGodownId", "godownId name type")
        .populate("items.itemId", "name itemCode")
        .populate("items.godownId", "godownId name type")
        .populate("items.uomId", "name symbol")
        .populate("items.perId", "name symbol multiplier")
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SaleModel.countDocuments(finalQuery),
    ]);

    return {
      sales,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    };
  }

  async updateSale(
    id: string | Types.ObjectId,
    data: any,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const updated = await SaleModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: data },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.SALE_NOT_FOUND,
        ERROR_CODES.SALE_NOT_FOUND
      );
    }
    return updated;
  }

  async deleteSale(
    id: string | Types.ObjectId,
    adminId: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await SaleModel.findOneAndUpdate(
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
        ERROR_MESSAGES.SALE_NOT_FOUND,
        ERROR_CODES.SALE_NOT_FOUND
      );
    }
    return updated;
  }
}
