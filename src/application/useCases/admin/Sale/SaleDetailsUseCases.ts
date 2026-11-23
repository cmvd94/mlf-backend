import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
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
export class GetSaleByIdUseCase {
  constructor(
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const sale: any = await this.saleRepository.getSaleById(id);
      if (!sale) {
        throw new HttpException(404, ERROR_MESSAGES.SALE_NOT_FOUND, ERROR_CODES.SALE_NOT_FOUND);
      }

      if (sale.companyGodownId) {
        const hasCompanyAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          sale.companyGodownId,
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

      for (const it of sale.items || []) {
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

      return sale;
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteSaleUseCase {
  constructor(
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const sale: any = await this.saleRepository.getSaleById(id);
      if (!sale || sale.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.SALE_NOT_FOUND, ERROR_CODES.SALE_NOT_FOUND);
      }

      if (sale.companyGodownId) {
        const canModify = await validateStockModificationAccessWithFetch(
          reqAdmin,
          sale.companyGodownId,
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

      for (const it of sale.items || []) {
        if (it.godownId) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, it.godownId as any);
          if (!hasAccess) {
            throw new HttpException(
              403,
              ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
              ERROR_CODES.GODOWN_ACCESS_DENIED
            );
          }
        }
      }

      // Revert sold stocks back to GodownStock docs & items atomically
      await withTransaction(async (session: ClientSession) => {
        for (const it of sale.items || []) {
          const stockDocId = it.godownStockId?._id || it.godownStockId;
          const qty = Number(it.actualQuantity ?? it.quantity) || 0;
          const uomQty = Number(it.uomQuantity) || 0;
          const itemId = (it.itemId?._id || it.itemId).toString();

          if (stockDocId && qty > 0) {
            await this.godownStockRepository.increaseStock(
              stockDocId,
              qty,
              reqAdmin.userId,
              session,
              uomQty
            );
          }
          if (itemId && qty > 0) {
            await this.itemRepository.adjustStockQuantity(itemId, qty, session);
          }
        }

        await this.saleRepository.deleteSale(id, reqAdmin.userId, session);
      });

      return {
        _id: sale._id,
        salesNumber: sale.salesNumber,
        isDeleted: true,
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}
