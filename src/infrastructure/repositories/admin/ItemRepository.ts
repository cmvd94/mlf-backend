import { injectable } from "tsyringe";
import { Item, ItemModel } from "@/domain/entities/admin/Item";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class ItemRepository {
  async createItem(
    data: Partial<Item>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await ItemModel.create([data], { session });
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
            ERROR_MESSAGES.ITEM_NAME_ALREADY_EXISTS,
            ERROR_CODES.ITEM_NAME_ALREADY_EXISTS
          );
        }
        if (error.keyPattern?.itemCode) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.ITEM_CODE_ALREADY_EXISTS,
            ERROR_CODES.ITEM_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[ITEM REPOSITORY]: Error creating Item: ${error}`);
    }
  }

  async updateItem(
    id: string | Types.ObjectId,
    data: Partial<Item>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await ItemModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.ITEM_NOT_FOUND,
          ERROR_CODES.ITEM_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.ITEM_NAME_ALREADY_EXISTS,
            ERROR_CODES.ITEM_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[ITEM REPOSITORY]: Error updating Item: ${error}`);
    }
  }

  async deleteItem(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await ItemModel.findOneAndUpdate(
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
        ERROR_MESSAGES.ITEM_NOT_FOUND,
        ERROR_CODES.ITEM_NOT_FOUND
      );
    }
    return updated;
  }

  async getItemById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await ItemModel.findOne({ _id: objectId, isDeleted: false })
      .populate("itemGroupId")
      .populate("defaultUomId")
      .populate("defaultPerId")
      .populate("hsnCodeId")
      .lean();
  }

  async getItemList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await ItemModel.find(finalQuery)
      .populate("itemGroupId")
      .populate("defaultUomId")
      .populate("defaultPerId")
      .populate("hsnCodeId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countItems(query: any = {}): Promise<number> {
    return await ItemModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActiveItems() {
    return await ItemModel.find({ isDeleted: false, isActive: true })
      .populate("itemGroupId")
      .populate("defaultUomId")
      .populate("defaultPerId")
      .populate("hsnCodeId")
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Adjusts stock quantity when a purchase is recorded, updated or reversed
   */
  async adjustStockQuantity(
    id: string | Types.ObjectId,
    quantityDelta: number,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const updated = await ItemModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $inc: { currentStock: quantityDelta } },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.ITEM_NOT_FOUND,
        ERROR_CODES.ITEM_NOT_FOUND
      );
    }
    return updated;
  }
}
