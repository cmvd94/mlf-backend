import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetPurchaseByIdUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const purchase: any = await this.purchaseRepository.getPurchaseById(id);
      if (!purchase) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_NOT_FOUND, ERROR_CODES.PURCHASE_NOT_FOUND);
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
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const existingPurchase: any = await this.purchaseRepository.getPurchaseById(id);
      if (!existingPurchase) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_NOT_FOUND, ERROR_CODES.PURCHASE_NOT_FOUND);
      }

      const rootGodownId = (existingPurchase.godownId as any)?._id || existingPurchase.godownId;

      // Revert stock for all items in their respective assigned godowns
      if (existingPurchase.items && existingPurchase.items.length > 0) {
        for (const it of existingPurchase.items) {
          const itemId = (it.itemId as any)?._id || it.itemId;
          const itemGodown = it.godownId || existingPurchase.godownId;
          const itemGodownId = (itemGodown as any)?._id || itemGodown;

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

          if (itemGodownId) {
            await this.godownStockRepository.adjustStock(
              itemGodownId.toString(),
              itemId.toString(),
              -Number(it.actualQuantity),
              reqAdmin.userId
            );
          }
          await this.itemRepository.adjustStockQuantity(itemId.toString(), -Number(it.actualQuantity));
        }
      } else if (existingPurchase.itemId) {
        const itemId = (existingPurchase.itemId as any)?._id || existingPurchase.itemId;
        if (rootGodownId) {
          await this.godownStockRepository.adjustStock(
            rootGodownId.toString(),
            itemId.toString(),
            -Number(existingPurchase.actualQuantity),
            reqAdmin.userId
          );
        }
        await this.itemRepository.adjustStockQuantity(itemId.toString(), -Number(existingPurchase.actualQuantity));
      }

      // Mark purchase deleted
      return await this.purchaseRepository.deletePurchase(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
