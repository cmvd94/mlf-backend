import { injectable } from "tsyringe";
import { GodownStock, GodownStockModel } from "@/domain/entities/admin/GodownStock";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ClientSession, Types } from "mongoose";

@injectable()
export class GodownStockRepository {
  /**
   * Adjusts stock quantity for a specific item in a specific godown.
   * Atomically upserts stock entry and increments/decrements quantity.
   */
  async adjustStock(
    godownId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    quantityDelta: number,
    adminId?: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<GodownStock> {
    const godownObjectId = typeof godownId === "string" ? generateObjectId(godownId) : godownId;
    const itemObjectId = typeof itemId === "string" ? generateObjectId(itemId) : itemId;
    const adminObjectId = adminId
      ? typeof adminId === "string"
        ? generateObjectId(adminId)
        : adminId
      : undefined;

    try {
      const updated = await GodownStockModel.findOneAndUpdate(
        { godownId: godownObjectId, itemId: itemObjectId },
        {
          $inc: { currentStock: quantityDelta },
          ...(adminObjectId ? { $set: { updatedBy: adminObjectId as any } } : {}),
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          session,
        }
      );

      return updated;
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

    const stockDoc = await GodownStockModel.findOne({
      godownId: godownObjectId,
      itemId: itemObjectId,
    }).lean();

    return stockDoc?.currentStock ?? 0;
  }

  /**
   * Get all item stocks in a specific godown
   */
  async getStocksByGodown(godownId: string | Types.ObjectId) {
    const godownObjectId = typeof godownId === "string" ? generateObjectId(godownId) : godownId;

    return await GodownStockModel.find({ godownId: godownObjectId })
      .populate("itemId", "name itemCode defaultUomId defaultPerId")
      .lean();
  }
}
