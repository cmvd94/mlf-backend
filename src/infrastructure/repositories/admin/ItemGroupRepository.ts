import { injectable } from "tsyringe";
import { ItemGroup, ItemGroupModel } from "@/domain/entities/admin/ItemGroup";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class ItemGroupRepository {
  async createItemGroup(
    data: Partial<ItemGroup>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await ItemGroupModel.create([data], { session });
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
            ERROR_MESSAGES.ITEM_GROUP_NAME_ALREADY_EXISTS,
            ERROR_CODES.ITEM_GROUP_NAME_ALREADY_EXISTS
          );
        }
        if (error.keyPattern?.code) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.ITEM_GROUP_CODE_ALREADY_EXISTS,
            ERROR_CODES.ITEM_GROUP_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[ITEM GROUP REPOSITORY]: Error creating item group: ${error}`);
    }
  }

  async updateItemGroup(
    id: string | Types.ObjectId,
    data: Partial<ItemGroup>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await ItemGroupModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.ITEM_GROUP_NOT_FOUND,
          ERROR_CODES.ITEM_GROUP_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.ITEM_GROUP_NAME_ALREADY_EXISTS,
            ERROR_CODES.ITEM_GROUP_NAME_ALREADY_EXISTS
          );
        }
        if (error.keyPattern?.code) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.ITEM_GROUP_CODE_ALREADY_EXISTS,
            ERROR_CODES.ITEM_GROUP_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[ITEM GROUP REPOSITORY]: Error updating item group: ${error}`);
    }
  }

  async deleteItemGroup(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await ItemGroupModel.findOneAndUpdate(
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
        ERROR_MESSAGES.ITEM_GROUP_NOT_FOUND,
        ERROR_CODES.ITEM_GROUP_NOT_FOUND
      );
    }
    return updated;
  }

  async getItemGroupById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await ItemGroupModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getItemGroupList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await ItemGroupModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countItemGroups(query: any = {}): Promise<number> {
    return await ItemGroupModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActiveItemGroups() {
    return await ItemGroupModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}
