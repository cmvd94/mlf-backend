import { injectable } from "tsyringe";
import { CreditNote, CreditNoteModel } from "@/domain/entities/admin/CreditNote";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import HttpException from "@/shared/exceptions/HttpException";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class CreditNoteRepository {
  async createCreditNote(
    data: Partial<CreditNote>,
    session?: ClientSession
  ): Promise<Types.ObjectId> {
    try {
      const created = await CreditNoteModel.create([data], { session });
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
        if (error.keyPattern?.creditNoteNumber) {
          throw new HttpException(
            409,
            ERROR_MESSAGES.CREDIT_NOTE_NUMBER_ALREADY_EXISTS,
            ERROR_CODES.CREDIT_NOTE_NUMBER_ALREADY_EXISTS
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new Error(`[CREDIT NOTE REPOSITORY]: Error creating Credit Note: ${error}`);
    }
  }

  async updateCreditNote(
    id: string | Types.ObjectId,
    data: Partial<CreditNote>,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const updated = await CreditNoteModel.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: data },
      { new: true, session }
    );
    if (!updated) {
      throw new HttpException(
        404,
        ERROR_MESSAGES.CREDIT_NOTE_NOT_FOUND,
        ERROR_CODES.CREDIT_NOTE_NOT_FOUND
      );
    }
    return updated;
  }

  async deleteCreditNote(
    id: string | Types.ObjectId,
    adminId: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    const adminObjectId = typeof adminId === "string" ? generateObjectId(adminId) : adminId;

    const updated = await CreditNoteModel.findOneAndUpdate(
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
        ERROR_MESSAGES.CREDIT_NOTE_NOT_FOUND,
        ERROR_CODES.CREDIT_NOTE_NOT_FOUND
      );
    }
    return updated;
  }

  async getCreditNoteById(id: string | Types.ObjectId) {
    const objectId = typeof id === "string" ? generateObjectId(id) : id;
    return await CreditNoteModel.findOne({ _id: objectId, isDeleted: false })
      .populate("partyId")
      .populate("purchaseTypeId")
      .populate("companyGodownId", "godownId name type country zone state district pincode")
      .populate("items.itemId")
      .populate("items.godownId", "godownId name type country zone state district pincode")
      .populate("items.companyGodownId", "godownId name type country zone state district pincode")
      .populate("items.uomId")
      .populate("items.perId")
      .populate("itemId")
      .populate("uomId")
      .populate("perId")
      .populate("godownId", "godownId name type country zone state district pincode")
      .populate("createdBy", "name phoneNumber")
      .lean();
  }

  async getCreditNoteList(query: any = {}, page: number = 1, limit: number = 20) {
    const finalQuery = { ...query, isDeleted: false };
    const skip = (page - 1) * limit;
    return await CreditNoteModel.find(finalQuery)
      .populate("partyId", "name partyCode")
      .populate("purchaseTypeId", "name code")
      .populate("companyGodownId", "godownId name type country zone state district pincode")
      .populate("items.itemId", "name itemCode currentStock")
      .populate("items.godownId", "godownId name type country zone state district pincode")
      .populate("items.companyGodownId", "godownId name type country zone state district pincode")
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

  async countCreditNotes(query: any = {}): Promise<number> {
    return await CreditNoteModel.countDocuments({ ...query, isDeleted: false });
  }
}
