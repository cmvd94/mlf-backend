import { injectable } from "tsyringe";
import { Party, PartyModel } from "@/domain/entities/admin/Party";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class PartyRepository {
  async createParty(
    data: Partial<Party>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await PartyModel.create([data], { session });
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
            ERROR_MESSAGES.PARTY_NAME_ALREADY_EXISTS,
            ERROR_CODES.PARTY_NAME_ALREADY_EXISTS
          );
        }
        if (error.keyPattern?.partyCode) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PARTY_CODE_ALREADY_EXISTS,
            ERROR_CODES.PARTY_CODE_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PARTY REPOSITORY]: Error creating party: ${error}`);
    }
  }

  async updateParty(
    id: string | Types.ObjectId,
    data: Partial<Party>,
    session?: ClientSession
  ) {
    try {
      const objectId = typeof id === "string" ? generateObjectId(id) : id;
      const updated = await PartyModel.findOneAndUpdate(
        { _id: objectId, isDeleted: false },
        { $set: data },
        { new: true, session }
      );
      if (!updated) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.PARTY_NOT_FOUND,
          ERROR_CODES.PARTY_NOT_FOUND
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error.keyPattern?.name) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.PARTY_NAME_ALREADY_EXISTS,
            ERROR_CODES.PARTY_NAME_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[PARTY REPOSITORY]: Error updating party: ${error}`);
    }
  }

  async deleteParty(id: string | Types.ObjectId, adminId: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await PartyModel.findOneAndUpdate(
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
        ERROR_MESSAGES.PARTY_NOT_FOUND,
        ERROR_CODES.PARTY_NOT_FOUND
      );
    }
    return updated;
  }

  async getPartyById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await PartyModel.findOne({ _id: objectId, isDeleted: false }).lean();
  }

  async getPartyList(query: any = {}, page: number = 1, limit: number = 50) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await PartyModel.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countParties(query: any = {}): Promise<number> {
    return await PartyModel.countDocuments({ ...query, isDeleted: false });
  }

  async getAllActiveParties() {
    return await PartyModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  async findPartiesByNameOrCode(term: string) {
    const regex = { $regex: term, $options: "i" };
    return await PartyModel.find({
      isDeleted: false,
      $or: [{ name: regex }, { partyCode: regex }],
    })
      .select("_id")
      .lean();
  }
}
