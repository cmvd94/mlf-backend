import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { compareAdminAndGodownLocation, validateStockModificationAccess, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetPurchaseByIdUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const purchase: any = await this.purchaseRepository.getPurchaseById(id);
      if (!purchase) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_NOT_FOUND, ERROR_CODES.PURCHASE_NOT_FOUND);
      }

      // Check access for company godown if present
      if (purchase.companyGodownId) {
        const hasCompanyAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          purchase.companyGodownId,
          this.godownRepository
        );
        if (!hasCompanyAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      // Check access for root godown if present
      if (purchase.godownId) {
        const hasAccess = compareAdminAndGodownLocation(reqAdmin, purchase.godownId as any);
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      // Check access for each individual item's godown
      if (purchase.items && purchase.items.length > 0) {
        for (const it of purchase.items) {
          if (it.godownId) {
            const hasItemAccess = compareAdminAndGodownLocation(reqAdmin, it.godownId as any);
            if (!hasItemAccess) {
              throw new HttpException(
                403,
                ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
                ERROR_CODES.GODOWN_ACCESS_DENIED
              );
            }
          }
        }
      }

      // Synthesize items for legacy records if items array is empty
      if ((!purchase.items || purchase.items.length === 0) && purchase.itemId) {
        purchase.items = [
          {
            itemId: purchase.itemId,
            godownId: purchase.godownId,
            uomId: purchase.uomId,
            uomQuantity: purchase.uomQuantity ?? purchase.actualQuantity ?? 1,
            actualQuantity: purchase.actualQuantity ?? 0,
            billedQuantity: purchase.billedQuantity ?? 0,
            rate: purchase.rate ?? 0,
            perId: purchase.perId,
            amount: purchase.amount ?? 0,
          },
        ];
      }

      return purchase;
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}

@injectable()
export class DeletePurchaseUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const existingPurchase: any = await this.purchaseRepository.getPurchaseById(id);
      if (!existingPurchase) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_NOT_FOUND, ERROR_CODES.PURCHASE_NOT_FOUND);
      }

      // Validate stock modification permission on the company godown that owns this purchase stock
      const targetCompanyGodown = existingPurchase.companyGodownId || existingPurchase.godownId;
      if (targetCompanyGodown) {
        const hasAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          targetCompanyGodown,
          this.godownRepository
        );
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      const rootGodownId = (existingPurchase.godownId as any)?._id || existingPurchase.godownId;

      // Verify whether any stock from this purchase has already been transferred or consumed
      const existingStocks = await this.godownStockRepository.findByPurchaseId(id);
      for (const stock of existingStocks) {
        const initial = Number(stock.initialStock !== undefined ? stock.initialStock : stock.currentStock) || 0;
        if (stock.currentStock < initial) {
          throw new HttpException(
            400,
            `Cannot delete purchase because stock for batch "${stock.batchNo}" has already been transferred or consumed.`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
      }

      // Revert stock for all items and mark purchase deleted inside a single transaction
      await withTransaction(async (session: ClientSession) => {
        await this.godownStockRepository.deleteByPurchaseId(id, reqAdmin.userId, session);

        if (existingPurchase.items && existingPurchase.items.length > 0) {
          for (const it of existingPurchase.items) {
            const itemId = (it.itemId as any)?._id || it.itemId;
            const itemGodown = it.godownId || existingPurchase.godownId;

            if (itemGodown) {
              const hasAccess = compareAdminAndGodownLocation(reqAdmin, itemGodown as any);
              if (!hasAccess) {
                throw new HttpException(
                  403,
                  ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
                  ERROR_CODES.GODOWN_ACCESS_DENIED
                );
              }
            }

            await this.itemRepository.adjustStockQuantity(itemId.toString(), -Number(it.actualQuantity), session);
          }
        } else if (existingPurchase.itemId) {
          const itemId = (existingPurchase.itemId as any)?._id || existingPurchase.itemId;
          await this.itemRepository.adjustStockQuantity(itemId.toString(), -Number(existingPurchase.actualQuantity), session);
        }

        // Mark purchase deleted
        await this.purchaseRepository.deletePurchase(id, reqAdmin.userId, session);
      });

      return { success: true };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
