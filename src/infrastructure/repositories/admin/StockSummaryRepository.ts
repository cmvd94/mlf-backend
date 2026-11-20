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
  batchNo: string;
  quantity: number;
  value: number;
  rate: number;
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
      "items.godownId": { $in: allGodownIdVariants },
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
                batchNo: { $ifNull: ["$$it.batchNo", ""] },
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
            batchNo: { $ifNull: ["$items.batchNo", ""] },
          },
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
        },
      },
    ];

    const rawResults = await PurchaseModel.aggregate(pipeline).exec();

    return rawResults.map((r) => {
      const qty = Number(r.totalQuantity) || 0;
      const val = Number(r.totalValue) || 0;
      const rate = qty > 0 ? Number((val / qty).toFixed(2)) : Number((r.avgRate || 0).toFixed(2));
      return {
        itemId: r._id.itemId.toString(),
        godownId: r._id.godownId.toString(),
        batchNo: (r._id.batchNo || "").trim(),
        quantity: qty,
        value: val,
        rate,
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
      godownId: { $in: allGodownIdVariants },
      currentStock: { $gt: 0 },
    };

    if (itemIds && itemIds.length > 0) {
      query.itemId = { $in: itemIds.map((id) => generateObjectId(id)) };
    }

    return await GodownStockModel.find(query).lean().exec();
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
