import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CreditNoteRepository } from "@/infrastructure/repositories/admin/CreditNoteRepository";
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
export class GetCreditNoteByIdUseCase {
  constructor(
    @inject(CreditNoteRepository) private creditNoteRepository: CreditNoteRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const creditNote: any = await this.creditNoteRepository.getCreditNoteById(id);
      if (!creditNote) {
        throw new HttpException(404, ERROR_MESSAGES.CREDIT_NOTE_NOT_FOUND, ERROR_CODES.CREDIT_NOTE_NOT_FOUND);
      }

      if (creditNote.companyGodownId) {
        const hasCompanyAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          creditNote.companyGodownId,
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

      if (creditNote.godownId) {
        const hasAccess = compareAdminAndGodownLocation(reqAdmin, creditNote.godownId as any);
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      for (const it of creditNote.items || []) {
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

      if ((!creditNote.items || creditNote.items.length === 0) && creditNote.itemId) {
        creditNote.items = [
          {
            itemId: creditNote.itemId,
            godownId: creditNote.godownId,
            uomId: creditNote.uomId,
            uomQuantity: creditNote.uomQuantity ?? creditNote.actualQuantity ?? 1,
            actualQuantity: creditNote.actualQuantity ?? 0,
            billedQuantity: creditNote.billedQuantity ?? 0,
            rate: creditNote.rate ?? 0,
            perId: creditNote.perId,
            amount: creditNote.amount ?? 0,
          },
        ];
      }

      return creditNote;
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.CreditNoteUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteCreditNoteUseCase {
  constructor(
    @inject(CreditNoteRepository) private creditNoteRepository: CreditNoteRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const existingCreditNote: any = await this.creditNoteRepository.getCreditNoteById(id);
      if (!existingCreditNote) {
        throw new HttpException(404, ERROR_MESSAGES.CREDIT_NOTE_NOT_FOUND, ERROR_CODES.CREDIT_NOTE_NOT_FOUND);
      }

      const targetCompanyGodown = existingCreditNote.companyGodownId || existingCreditNote.godownId;
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

      // Verify whether any stock created by this credit note has already been transferred or consumed
      const existingStocks = await this.godownStockRepository.findByCreditNoteId(id);
      for (const stock of existingStocks) {
        const initial = Number(stock.initialStock !== undefined ? stock.initialStock : stock.currentStock) || 0;
        if (stock.currentStock < initial) {
          const label = stock.dcNo || (stock as any).batchNo || "N/A";
          throw new HttpException(
            400,
            `Cannot delete credit note because stock for DC "${label}" has already been transferred or consumed.`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
      }

      await withTransaction(async (session: ClientSession) => {
        await this.godownStockRepository.deleteByCreditNoteId(id, reqAdmin.userId, session);

        if (existingCreditNote.items && existingCreditNote.items.length > 0) {
          for (const it of existingCreditNote.items) {
            const itemId = (it.itemId as any)?._id || it.itemId;
            const itemGodown = it.godownId || existingCreditNote.godownId;

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
        } else if (existingCreditNote.itemId) {
          const itemId = (existingCreditNote.itemId as any)?._id || existingCreditNote.itemId;
          await this.itemRepository.adjustStockQuantity(itemId.toString(), -Number(existingCreditNote.actualQuantity), session);
        }

        await this.creditNoteRepository.deleteCreditNote(id, reqAdmin.userId, session);
      });

      return { success: true };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.CreditNoteUseCase, this.logger);
    }
  }
}
