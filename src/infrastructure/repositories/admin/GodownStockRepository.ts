import { injectable } from "tsyringe";
import { GodownStock, GodownStockModel, StockSourceType } from "@/domain/entities/admin/GodownStock";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

export interface CreateBatchStockParams {
  godownId: string | Types.ObjectId;
  companyGodownId: string | Types.ObjectId;
  itemId: string | Types.ObjectId;
  dcNo?: string;
  lotNo?: string;
  batchNo?: string;
  currentStock: number;
  initialStock?: number;
  rate?: number;
  amount?: number;
  uomId?: string | Types.ObjectId;
  uomQuantity?: number;
  perId?: string | Types.ObjectId;
  purchaseId?: string | Types.ObjectId;
  purchaseItemId?: string | Types.ObjectId;
  creditNoteId?: string | Types.ObjectId;
  creditNoteItemId?: string | Types.ObjectId;
  stockTransferId?: string | Types.ObjectId;
  sourceType?: StockSourceType;
  createdBy?: string | Types.ObjectId;
  updatedBy?: string | Types.ObjectId;
}

@injectable()
export class GodownStockRepository {
  /**
   * Creates a new GodownStock doc for a specific item, batch, and godown.
   */
  async createBatchStock(params: CreateBatchStockParams, session?: ClientSession): Promise<GodownStock> {
    const docData: any = {
      godownId: typeof params.godownId === "string" ? generateObjectId(params.godownId) : params.godownId,
      companyGodownId: typeof params.companyGodownId === "string" ? generateObjectId(params.companyGodownId) : params.companyGodownId,
      itemId: typeof params.itemId === "string" ? generateObjectId(params.itemId) : params.itemId,
      dcNo: (params.dcNo || params.batchNo || "").trim(),
      lotNo: (params.lotNo || "").trim(),
      currentStock: Number(params.currentStock) || 0,
      initialStock: params.initialStock !== undefined ? Number(params.initialStock) : Number(params.currentStock) || 0,
      uomQuantity: params.uomQuantity !== undefined ? Number(params.uomQuantity) : 1,
      sourceType: params.sourceType || StockSourceType.PURCHASE,
      isActive: true,
      isDeleted: false,
    };

    if (params.uomId) {
      docData.uomId = typeof params.uomId === "string" ? generateObjectId(params.uomId) : params.uomId;
    }
    if (params.perId) {
      docData.perId = typeof params.perId === "string" ? generateObjectId(params.perId) : params.perId;
    }
    if (params.purchaseId) {
      docData.purchaseId = typeof params.purchaseId === "string" ? generateObjectId(params.purchaseId) : params.purchaseId;
    }
    if (params.purchaseItemId) {
      docData.purchaseItemId = typeof params.purchaseItemId === "string" ? generateObjectId(params.purchaseItemId) : params.purchaseItemId;
    }
    if (params.creditNoteId) {
      docData.creditNoteId = typeof params.creditNoteId === "string" ? generateObjectId(params.creditNoteId) : params.creditNoteId;
    }
    if (params.creditNoteItemId) {
      docData.creditNoteItemId = typeof params.creditNoteItemId === "string" ? generateObjectId(params.creditNoteItemId) : params.creditNoteItemId;
    }
    if (params.stockTransferId) {
      docData.stockTransferId = typeof params.stockTransferId === "string" ? generateObjectId(params.stockTransferId) : params.stockTransferId;
    }
    if (params.createdBy) {
      docData.createdBy = typeof params.createdBy === "string" ? generateObjectId(params.createdBy) : params.createdBy;
    }
    if (params.updatedBy) {
      docData.updatedBy = typeof params.updatedBy === "string" ? generateObjectId(params.updatedBy) : params.updatedBy;
    }

    const created = await GodownStockModel.create([docData], { session });
    return created[0].toObject();
  }

  /**
   * Updates an existing GodownStock doc in place.
   */
  async updateBatchStock(
    id: string | Types.ObjectId,
    updateData: Record<string, any>,
    session?: ClientSession
  ): Promise<GodownStock | null> {
    const stockObjectId = typeof id === "string" ? generateObjectId(id) : id;
    return await GodownStockModel.findByIdAndUpdate(
      stockObjectId,
      { $set: updateData },
      { new: true, session }
    ).lean();
  }

  /**
   * Decreases stock for a specific GodownStock doc by batch reference.
   * Ensures atomic operation and verifies stock sufficiency.
   */
  async decreaseStock(
    godownStockId: string | Types.ObjectId,
    quantity: number,
    adminId?: string | Types.ObjectId,
    session?: ClientSession,
    uomQuantity?: number
  ): Promise<GodownStock | null> {
    const stockObjectId = typeof godownStockId === "string" ? generateObjectId(godownStockId) : godownStockId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    const filter: any = {
      _id: stockObjectId,
      currentStock: { $gte: quantity },
      isDeleted: false,
    };
    if (uomQuantity !== undefined && uomQuantity > 0) {
      filter.uomQuantity = { $gte: uomQuantity };
    }

    const incUpdate: any = { currentStock: -quantity };
    if (uomQuantity !== undefined && uomQuantity > 0) {
      incUpdate.uomQuantity = -uomQuantity;
    }

    return await GodownStockModel.findOneAndUpdate(
      filter,
      {
        $inc: incUpdate,
        ...(adminObjectId ? { $set: { updatedBy: adminObjectId as any } } : {}),
      },
      { new: true, session }
    ).lean();
  }

  /**
   * Increases stock for a specific GodownStock doc (e.g. transfer return or revert).
   */
  async increaseStock(
    godownStockId: string | Types.ObjectId,
    quantity: number,
    adminId?: string | Types.ObjectId,
    session?: ClientSession,
    uomQuantity?: number
  ): Promise<GodownStock | null> {
    const stockObjectId = typeof godownStockId === "string" ? generateObjectId(godownStockId) : godownStockId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    const incUpdate: any = { currentStock: quantity };
    if (uomQuantity !== undefined && uomQuantity > 0) {
      incUpdate.uomQuantity = uomQuantity;
    }

    return await GodownStockModel.findOneAndUpdate(
      { _id: stockObjectId, isDeleted: false },
      {
        $inc: incUpdate,
        ...(adminObjectId ? { $set: { updatedBy: adminObjectId as any } } : {}),
      },
      { new: true, session }
    ).lean();
  }

  /**
   * Find a specific GodownStock by ID
   */
  async findById(id: string | Types.ObjectId) {
    const stockObjectId = typeof id === "string" ? generateObjectId(id) : id;
    return await GodownStockModel.findOne({ _id: stockObjectId, isDeleted: false })
      .populate("godownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("companyGodownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("itemId", "name itemCode defaultUomId defaultPerId standardRate")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .populate("purchaseId", "items")
      .populate("stockTransferId", "sourceItems destinationItems")
      .lean();
  }

  /**
   * Find all GodownStock docs created by a purchase
   */
  async findByPurchaseId(purchaseId: string | Types.ObjectId) {
    const pObjectId = typeof purchaseId === "string" ? generateObjectId(purchaseId) : purchaseId;
    return await GodownStockModel.find({ purchaseId: pObjectId, isDeleted: false }).lean();
  }

  /**
   * Find all GodownStock docs created by a stock transfer
   */
  async findByStockTransferId(stockTransferId: string | Types.ObjectId) {
    const stObjectId = typeof stockTransferId === "string" ? generateObjectId(stockTransferId) : stockTransferId;
    return await GodownStockModel.find({ stockTransferId: stObjectId, isDeleted: false }).lean();
  }

  /**
   * Find all GodownStock docs created by a credit note
   */
  async findByCreditNoteId(creditNoteId: string | Types.ObjectId) {
    const cnObjectId = typeof creditNoteId === "string" ? generateObjectId(creditNoteId) : creditNoteId;
    return await GodownStockModel.find({ creditNoteId: cnObjectId, isDeleted: false }).lean();
  }

  /**
   * Delete or soft-delete all stock records for a purchase
   */
  async deleteByPurchaseId(
    purchaseId: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const pObjectId = typeof purchaseId === "string" ? generateObjectId(purchaseId) : purchaseId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    return await GodownStockModel.updateMany(
      { purchaseId: pObjectId },
      {
        $set: {
          currentStock: 0,
          isDeleted: true,
          ...(adminObjectId ? { updatedBy: adminObjectId as any } : {}),
        },
      },
      { session }
    );
  }

  /**
   * Delete or soft-delete all stock records for a stock transfer
   */
  async deleteByStockTransferId(
    stockTransferId: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const stObjectId = typeof stockTransferId === "string" ? generateObjectId(stockTransferId) : stockTransferId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    return await GodownStockModel.updateMany(
      { stockTransferId: stObjectId },
      {
        $set: {
          currentStock: 0,
          isDeleted: true,
          ...(adminObjectId ? { updatedBy: adminObjectId as any } : {}),
        },
      },
      { session }
    );
  }

  /**
   * Delete or soft-delete all stock records for a credit note
   */
  async deleteByCreditNoteId(
    creditNoteId: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    session?: ClientSession
  ) {
    const cnObjectId = typeof creditNoteId === "string" ? generateObjectId(creditNoteId) : creditNoteId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    return await GodownStockModel.updateMany(
      { creditNoteId: cnObjectId },
      {
        $set: {
          currentStock: 0,
          isDeleted: true,
          ...(adminObjectId ? { updatedBy: adminObjectId as any } : {}),
        },
      },
      { session }
    );
  }

  /**
   * Get all available stocks (where currentStock > 0) in accessible godowns
   */
  async getAvailableStocks(godownIds: string[], itemId?: string, search?: string, companyGodownIds?: string[]) {
    if (!godownIds || godownIds.length === 0) return [];

    const godownObjectIds = godownIds.map((id) => generateObjectId(id));
    const allGodownIdVariants = [...godownObjectIds, ...godownIds];

    const matchQuery: any = {
      godownId: { $in: allGodownIdVariants },
      currentStock: { $gt: 0 },
      isDeleted: false,
    };

    if (companyGodownIds && companyGodownIds.length > 0) {
      const compObjectIds = companyGodownIds.map((id) => generateObjectId(id));
      const allCompVariants = [...compObjectIds, ...companyGodownIds];
      matchQuery.companyGodownId = { $in: allCompVariants };
    }

    if (itemId && itemId.trim().length > 0) {
      matchQuery.itemId = generateObjectId(itemId.trim());
    }

    if (search && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), "i");
      matchQuery.$or = [{ dcNo: regex }, { lotNo: regex }, { batchNo: regex }];
    }

    return await GodownStockModel.find(matchQuery)
      .populate("godownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("companyGodownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("itemId", "name itemCode itemGroupId defaultUomId defaultPerId")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .populate("purchaseId", "items")
      .populate("stockTransferId", "sourceItems destinationItems")
      .sort({ updatedAt: -1 })
      .lean();
  }

  /**
   * Legacy adjustment helper for backward compatibility
   */
  async adjustStock(
    godownId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    quantityDelta: number,
    adminId?: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<any> {
    const godownObjectId = typeof godownId === "string" ? generateObjectId(godownId) : godownId;
    const itemObjectId = typeof itemId === "string" ? generateObjectId(itemId) : itemId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    try {
      const existing = await GodownStockModel.findOne({
        godownId: godownObjectId,
        itemId: itemObjectId,
        isDeleted: false,
      }).sort({ updatedAt: -1 });

      if (existing) {
        existing.currentStock += quantityDelta;
        if (adminObjectId) existing.updatedBy = adminObjectId as any;
        await existing.save({ session });
        return existing.toObject();
      }

      const created = await GodownStockModel.create(
        [
          {
            godownId: godownObjectId,
            itemId: itemObjectId,
            currentStock: quantityDelta,
            initialStock: quantityDelta,
            batchNo: "",
            sourceType: StockSourceType.MANUAL,
            ...(adminObjectId ? { updatedBy: adminObjectId as any, createdBy: adminObjectId as any } : {}),
          },
        ],
        { session }
      );
      return created[0].toObject();
    } catch (error) {
      throw new Error(
        `[GODOWN STOCK REPOSITORY]: Failed to adjust godown stock for godown ${godownId} and item ${itemId}: ${error}`
      );
    }
  }

  /**
   * Get current stock of a specific item in a specific godown
   */
  async getStock(
    godownId: string | Types.ObjectId,
    itemId: string | Types.ObjectId
  ): Promise<number> {
    const godownObjectId = typeof godownId === "string" ? generateObjectId(godownId) : godownId;
    const itemObjectId = typeof itemId === "string" ? generateObjectId(itemId) : itemId;

    const stocks = await GodownStockModel.find({
      godownId: godownObjectId,
      itemId: itemObjectId,
      isDeleted: false,
    }).lean();

    return stocks.reduce((acc, s) => acc + (s.currentStock || 0), 0);
  }

  /**
   * Get all item stocks in a specific godown
   */
  async getStocksByGodown(godownId: string | Types.ObjectId) {
    const godownObjectId = typeof godownId === "string" ? generateObjectId(godownId) : godownId;

    return await GodownStockModel.find({ godownId: godownObjectId, isDeleted: false })
      .populate("godownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("companyGodownId", "godownId name type country zone state district pincode isActive godownManagerId supervisorId assistantId billingUserId")
      .populate("itemId", "name itemCode defaultUomId defaultPerId")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .lean();
  }
}
