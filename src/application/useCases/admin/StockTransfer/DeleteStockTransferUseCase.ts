import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class DeleteStockTransferUseCase {
  constructor(
    @inject(StockTransferRepository) private stockTransferRepository: StockTransferRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const existingTransfer: any = await this.stockTransferRepository.getStockTransferById(id);
      if (!existingTransfer || existingTransfer.isDeleted) {
        throw new HttpException(404, "Stock transfer not found", ERROR_CODES.NOT_FOUND);
      }

      // Check access for source items godowns and company godowns
      for (const src of existingTransfer.sourceItems || []) {
        const sourceGodown = src.godownId;
        const ownerCompanyGodown = src.companyGodownId || sourceGodown;

        if (ownerCompanyGodown) {
          const canModify = await validateStockModificationAccessWithFetch(
            reqAdmin,
            ownerCompanyGodown,
            this.godownRepository
          );
          if (!canModify) {
            throw new HttpException(
              403,
              ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
              ERROR_CODES.GODOWN_ACCESS_DENIED
            );
          }
        }

        if (sourceGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, sourceGodown);
          if (!hasAccess) {
            throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      // Check access for destination items godowns
      for (const dest of existingTransfer.destinationItems || []) {
        const destGodown = dest.godownId;
        if (destGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, destGodown);
          if (!hasAccess) {
            throw new HttpException(403, "Access denied to destination godown", ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      // Verify whether any stock created by this transfer has already been consumed or transferred away
      const existingStocks = await this.godownStockRepository.findByStockTransferId(existingTransfer._id);
      for (const stock of existingStocks) {
        const initial = Number(stock.initialStock !== undefined ? stock.initialStock : stock.currentStock) || 0;
        if (Number(stock.currentStock) < initial) {
          const label = stock.dcNo || (stock as any).batchNo || "N/A";
          throw new HttpException(
            400,
            `Cannot delete stock transfer because destination stock for DC "${label}" has already been transferred or consumed.`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
      }

      // Revert stock atomically in a transaction:
      // 1. Delete destination batches and decrement destination aggregate item stocks
      // 2. Add back source quantities to source batches and increment source aggregate item stocks
      // 3. Mark the StockTransfer document as deleted
      await withTransaction(async (session: ClientSession) => {
        // Decrement destination item stock aggregates
        for (const dest of existingTransfer.destinationItems || []) {
          const destItemId = (dest.itemId?._id || dest.itemId).toString();
          const destQty = Number(dest.quantity) || 0;
          await this.itemRepository.adjustStockQuantity(destItemId, -destQty, session);
        }

        // Delete destination GodownStock records created by this transfer
        await this.godownStockRepository.deleteByStockTransferId(existingTransfer._id, reqAdmin.userId, session);

        // Increase source batches and aggregate item stocks back
        for (const src of existingTransfer.sourceItems || []) {
          const srcStockId = (src.godownStockId?._id || src.godownStockId).toString();
          const srcItemId = (src.itemId?._id || src.itemId).toString();
          const srcQty = Number(src.quantity) || 0;
          const srcUomQty = Number(src.uomQuantity) || 0;

          await this.godownStockRepository.increaseStock(srcStockId, srcQty, reqAdmin.userId, session, srcUomQty);
          await this.itemRepository.adjustStockQuantity(srcItemId, srcQty, session);
        }

        // Mark stock transfer deleted
        await this.stockTransferRepository.deleteStockTransfer(id, reqAdmin.userId, session);
      });

      return { success: true, message: "Stock transfer deleted successfully and stocks reverted" };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
