import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { DebitNoteRepository } from "@/infrastructure/repositories/admin/DebitNoteRepository";
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
export class GetDebitNoteByIdUseCase {
  constructor(
    @inject(DebitNoteRepository) private debitNoteRepository: DebitNoteRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const debitNote: any = await this.debitNoteRepository.getDebitNoteById(id);
      if (!debitNote) {
        throw new HttpException(404, ERROR_MESSAGES.DEBIT_NOTE_NOT_FOUND, ERROR_CODES.DEBIT_NOTE_NOT_FOUND);
      }

      if (debitNote.companyGodownId) {
        const hasCompanyAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          debitNote.companyGodownId,
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

      for (const it of debitNote.items || []) {
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

      return debitNote;
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.DebitNoteUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteDebitNoteUseCase {
  constructor(
    @inject(DebitNoteRepository) private debitNoteRepository: DebitNoteRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const debitNote: any = await this.debitNoteRepository.getDebitNoteById(id);
      if (!debitNote || debitNote.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.DEBIT_NOTE_NOT_FOUND, ERROR_CODES.DEBIT_NOTE_NOT_FOUND);
      }

      if (debitNote.companyGodownId) {
        const canModify = await validateStockModificationAccessWithFetch(
          reqAdmin,
          debitNote.companyGodownId,
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

      for (const it of debitNote.items || []) {
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

      // Revert debited stocks back to GodownStock docs & items atomically
      await withTransaction(async (session: ClientSession) => {
        for (const it of debitNote.items || []) {
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

        await this.debitNoteRepository.deleteDebitNote(id, reqAdmin.userId, session);
      });

      return {
        _id: debitNote._id,
        debitNoteNumber: debitNote.debitNoteNumber,
        isDeleted: true,
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.DebitNoteUseCase, this.logger);
    }
  }
}
