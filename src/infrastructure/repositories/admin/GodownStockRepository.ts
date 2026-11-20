import { injectable } from "tsyringe";
import { GodownStock, GodownStockModel } from "@/domain/entities/admin/GodownStock";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

export interface CreateBatchStockParams {
  godownId: string | Types.ObjectId;
  itemId: string | Types.ObjectId;
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
  stockTransferId?: string | Types.ObjectId;
  sourceType?: string;
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
      itemId: typeof params.itemId === "string" ? generateObjectId(params.itemId) : params.itemId,
      batchNo: (params.batchNo || "").trim(),
      currentStock: Number(params.currentStock) || 0,
      initialStock: params.initialStock !== undefined ? Number(params.initialStock) : Number(params.currentStock) || 0,
      uomQuantity: params.uomQuantity !== undefined ? Number(params.uomQuantity) : 1,
      sourceType: params.sourceType || "PURCHASE",
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
    session?: ClientSession
  ): Promise<GodownStock | null> {
    const stockObjectId = typeof godownStockId === "string" ? generateObjectId(godownStockId) : godownStockId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    return await GodownStockModel.findOneAndUpdate(
      {
        _id: stockObjectId,
        currentStock: { $gte: quantity },
        isDeleted: false,
      },
      {
        $inc: { currentStock: -quantity },
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
    session?: ClientSession
  ): Promise<GodownStock | null> {
    const stockObjectId = typeof godownStockId === "string" ? generateObjectId(godownStockId) : godownStockId;
    const adminObjectId = adminId ? (typeof adminId === "string" ? generateObjectId(adminId) : adminId) : undefined;

    return await GodownStockModel.findOneAndUpdate(
      { _id: stockObjectId, isDeleted: false },
      {
        $inc: { currentStock: quantity },
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
      .populate("godownId", "name code location isJobwork isActive")
      .populate("itemId", "name itemCode defaultUomId defaultPerId standardRate")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
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
   * Get all available stocks (where currentStock > 0) in accessible godowns
   */
  async getAvailableStocks(godownIds: string[], itemId?: string, search?: string) {
    if (!godownIds || godownIds.length === 0) return [];

    const godownObjectIds = godownIds.map((id) => generateObjectId(id));
    const allGodownIdVariants = [...godownObjectIds, ...godownIds];

    const matchQuery: any = {
      godownId: { $in: allGodownIdVariants },
      currentStock: { $gt: 0 },
      isDeleted: false,
    };

    if (itemId && itemId.trim().length > 0) {
      matchQuery.itemId = generateObjectId(itemId.trim());
    }

    if (search && search.trim().length > 0) {
      matchQuery.batchNo = new RegExp(search.trim(), "i");
    }

    return await GodownStockModel.find(matchQuery)
      .populate("godownId", "name code location isJobwork")
      .populate("itemId", "name itemCode itemGroupId defaultUomId defaultPerId")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
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
            sourceType: "MANUAL",
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
      .populate("itemId", "name itemCode defaultUomId defaultPerId")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .lean();
  }
}
