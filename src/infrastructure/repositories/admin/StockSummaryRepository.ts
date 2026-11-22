import { injectable } from "tsyringe";
import { Types } from "mongoose";
import { ItemModel, Item } from "@/domain/entities/admin/Item";
import { ItemGroupModel, ItemGroup } from "@/domain/entities/admin/ItemGroup";
import { GodownModel, Godown } from "@/domain/entities/admin/Godown";
import { PurchaseModel } from "@/domain/entities/admin/Purchase";
import { GodownStockModel } from "@/domain/entities/admin/GodownStock";
import { generateObjectId } from "@/shared/utils/generateObjectId";

export interface RawBatchStock {
  itemId: string;
  godownId: string;
  dcNo: string;
  lotNo: string;
  batchNo?: string;
  uomQuantity?: number;
  quantity: number;
  value: number;
  rate: number;
  date?: Date;
}

@injectable()
export class StockSummaryRepository {
  /**
   * Retrieves aggregated purchase batch lines filtered by accessible godowns and optional date range.
   */
  async getPurchaseBatchStocks(
    accessibleGodownIds: string[],
    options?: {
      fromDate?: Date;
      toDate?: Date;
      itemIds?: string[];
    }
  ): Promise<RawBatchStock[]> {
    if (!accessibleGodownIds || accessibleGodownIds.length === 0) {
      return [];
    }

    const godownObjectIds = accessibleGodownIds.map((id) => generateObjectId(id));
    const allGodownIdVariants = [...godownObjectIds, ...accessibleGodownIds];
    const matchStage: any = {
      isDeleted: false,
      isActive: true,
    };

    if (options?.fromDate || options?.toDate) {
      matchStage.date = {};
      if (options.fromDate) matchStage.date.$gte = options.fromDate;
      if (options.toDate) matchStage.date.$lte = options.toDate;
    }

    const itemFilterMatch: any = {
      $or: [
        { "items.godownId": { $in: allGodownIdVariants } },
        { "items.companyGodownId": { $in: allGodownIdVariants } },
      ],
    };

    if (options?.itemIds && options.itemIds.length > 0) {
      const itemObjectIds = options.itemIds.map((id) => generateObjectId(id));
      itemFilterMatch["items.itemId"] = { $in: itemObjectIds };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $project: {
          date: 1,
          items: {
            $map: {
              input: { $ifNull: ["$items", []] },
              as: "it",
              in: {
                itemId: "$$it.itemId",
                godownId: { $ifNull: ["$$it.godownId", "$godownId"] },
                companyGodownId: { $ifNull: ["$$it.companyGodownId", "$companyGodownId"] },
                dcNo: { $ifNull: ["$$it.dcNo", { $ifNull: ["$$it.batchNo", ""] }] },
                lotNo: { $ifNull: ["$$it.lotNo", ""] },
                batchNo: { $ifNull: ["$$it.batchNo", ""] },
                uomQuantity: { $ifNull: ["$$it.uomQuantity", 0] },
                actualQuantity: { $ifNull: ["$$it.actualQuantity", 0] },
                billedQuantity: { $ifNull: ["$$it.billedQuantity", 0] },
                rate: { $ifNull: ["$$it.rate", 0] },
                amount: { $ifNull: ["$$it.amount", 0] },
              },
            },
          },
        },
      },
      { $unwind: "$items" },
      { $match: itemFilterMatch },
      {
        $group: {
          _id: {
            itemId: "$items.itemId",
            godownId: "$items.godownId",
            dcNo: { $ifNull: ["$items.dcNo", { $ifNull: ["$items.batchNo", ""] }] },
            lotNo: { $ifNull: ["$items.lotNo", ""] },
          },
          totalUomQuantity: { $sum: "$items.uomQuantity" },
          totalQuantity: { $sum: "$items.actualQuantity" },
          totalValue: {
            $sum: {
              $cond: [
                { $gt: ["$items.amount", 0] },
                "$items.amount",
                { $multiply: ["$items.actualQuantity", "$items.rate"] },
              ],
            },
          },
          avgRate: { $avg: "$items.rate" },
          latestDate: { $max: "$date" },
        },
      },
    ];

    const rawResults = await PurchaseModel.aggregate(pipeline).exec();

    return rawResults.map((r) => {
      const uomQty = Number(r.totalUomQuantity) || 0;
      const qty = Number(r.totalQuantity) || 0;
      const val = Number(r.totalValue) || 0;
      const rate = qty > 0 ? Number((val / qty).toFixed(2)) : Number((r.avgRate || 0).toFixed(2));
      return {
        itemId: r._id.itemId.toString(),
        godownId: r._id.godownId.toString(),
        dcNo: (r._id.dcNo || "").trim(),
        lotNo: (r._id.lotNo || "").trim(),
        batchNo: (r._id.dcNo || "").trim(),
        uomQuantity: uomQty,
        quantity: qty,
        value: val,
        rate,
        date: r.latestDate ? new Date(r.latestDate) : undefined,
      };
    });
  }

  /**
   * Retrieves godown stock records for accessible godowns.
   */
  async getGodownStocks(accessibleGodownIds: string[], itemIds?: string[]) {
    if (!accessibleGodownIds || accessibleGodownIds.length === 0) {
      return [];
    }

    const godownObjectIds = accessibleGodownIds.map((id) => generateObjectId(id));
    const allGodownIdVariants = [...godownObjectIds, ...accessibleGodownIds];
    const query: any = {
      $or: [
        { godownId: { $in: allGodownIdVariants } },
        { companyGodownId: { $in: allGodownIdVariants } },
      ],
      isDeleted: false,
    };

    if (itemIds && itemIds.length > 0) {
      query.itemId = { $in: itemIds.map((id) => generateObjectId(id)) };
    }

    return await GodownStockModel.find(query)
      .populate("stockTransferId", "sourceItems destinationItems")
      .populate("purchaseId", "items")
      .populate("uomId", "name symbol")
      .populate("perId", "name symbol multiplier")
      .lean()
      .exec();
  }

  /**
   * Loads all active item groups
   */
  async getAllActiveItemGroups(): Promise<ItemGroup[]> {
    return await ItemGroupModel.find({ isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  /**
   * Loads all active items with populated UOM and Group
   */
  async getAllActiveItems(filter?: { groupId?: string; search?: string }): Promise<any[]> {
    const query: any = { isDeleted: false, isActive: true };

    if (filter?.groupId) {
      query.itemGroupId = generateObjectId(filter.groupId);
    }

    if (filter?.search && filter.search.trim().length > 0) {
      const regex = new RegExp(filter.search.trim(), "i");
      query.$or = [{ name: regex }, { itemCode: regex }, { description: regex }];
    }

    return await ItemModel.find(query)
      .populate("itemGroupId", "name code")
      .populate("defaultUomId", "name symbol")
      .populate("defaultPerId", "name symbol multiplier")
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  /**
   * Loads godowns by IDs
   */
  async getGodownsByIds(godownIds: string[]): Promise<Godown[]> {
    if (!godownIds || godownIds.length === 0) return [];
    const objectIds = godownIds.map((id) => generateObjectId(id));
    return await GodownModel.find({ _id: { $in: objectIds }, isDeleted: false })
      .lean()
      .exec();
  }
}
