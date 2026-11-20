import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseModel } from "@/domain/entities/admin/Purchase";
import { GodownStockModel } from "@/domain/entities/admin/GodownStock";

@injectable()
export class InitializeOnStartup {
  constructor(
    @inject("CommonLogger")
    private logger: Logger
  ) {}

  public async initialize() {
    this.logger.info("Starting server initialization tasks...");
    await this.backfillPurchaseGodownStocks();
    this.logger.info("Server initialization tasks completed.");
  }

  private async backfillPurchaseGodownStocks() {
    try {
      const purchases = await PurchaseModel.find({ isDeleted: false });
      let backfilledCount = 0;

      for (const p of purchases) {
        let modified = false;

        if (p.items && p.items.length > 0) {
          for (const it of p.items) {
            if (!it.godownStockId && it.godownId && it.itemId) {
              const stockDoc = await GodownStockModel.create({
                godownId: it.godownId,
                itemId: it.itemId,
                batchNo: (it.batchNo || "").trim(),
                currentStock: it.actualQuantity || 0,
                initialStock: it.actualQuantity || 0,
                rate: it.rate || 0,
                amount: it.amount || 0,
                uomId: it.uomId,
                uomQuantity: it.uomQuantity || 1,
                perId: it.perId,
                purchaseId: p._id,
                sourceType: "PURCHASE",
                isActive: true,
                isDeleted: false,
                createdBy: p.createdBy,
              });
              (it as any).godownStockId = stockDoc._id;
              modified = true;
              backfilledCount++;
            }
          }
        } else if (p.itemId && p.godownId && !(p as any).godownStockId) {
          const stockDoc = await GodownStockModel.create({
            godownId: p.godownId,
            itemId: p.itemId,
            batchNo: (p.batchNo || "").trim(),
            currentStock: p.actualQuantity || 0,
            initialStock: p.actualQuantity || 0,
            rate: p.rate || 0,
            amount: p.amount || 0,
            uomId: p.uomId,
            uomQuantity: p.uomQuantity || 1,
            perId: p.perId,
            purchaseId: p._id,
            sourceType: "PURCHASE",
            isActive: true,
            isDeleted: false,
            createdBy: p.createdBy,
          });
          (p as any).godownStockId = stockDoc._id;
          modified = true;
          backfilledCount++;
        }

        if (modified) {
          await p.save();
        }
      }

      if (backfilledCount > 0) {
        this.logger.info(`Successfully backfilled ${backfilledCount} purchase stock items with GodownStock documents.`);
      }
    } catch (err) {
      this.logger.warn(`Could not backfill purchase godown stocks: ${err}`);
    }
  }
}
