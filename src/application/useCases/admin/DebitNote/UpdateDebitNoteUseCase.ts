import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { DebitNoteRepository } from "@/infrastructure/repositories/admin/DebitNoteRepository";
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { UpdateDebitNoteDTO } from "@/shared/dto/admin/debitNoteDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { parseVoucherDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { FINANCIAL_CONFIG } from "@/shared/constants/financialConfig";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class UpdateDebitNoteUseCase {
  constructor(
    @inject(DebitNoteRepository) private debitNoteRepository: DebitNoteRepository,
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateDebitNoteDTO, reqAdmin: ReqAdminDTO) {
    try {
      const existingDebitNote: any = await this.debitNoteRepository.getDebitNoteById(id);
      if (!existingDebitNote || existingDebitNote.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.DEBIT_NOTE_NOT_FOUND, ERROR_CODES.DEBIT_NOTE_NOT_FOUND);
      }

      const currentCompanyGodown = existingDebitNote.companyGodownId;
      if (currentCompanyGodown) {
        const canModify = await validateStockModificationAccessWithFetch(
          reqAdmin,
          currentCompanyGodown,
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

      for (const it of existingDebitNote.items || []) {
        const itGodown = it.godownId;
        if (itGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, itGodown);
          if (!hasAccess) {
            throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      const typeIdInput = dto.debitNoteTypeId || dto.salesTypeId;
      let salesTypeId = existingDebitNote.salesTypeId?._id || existingDebitNote.salesTypeId;
      if (typeIdInput) {
        const salesType = await this.salesTypeRepository.getSalesTypeById(typeIdInput);
        if (!salesType || !salesType.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.SALES_TYPE_NOT_FOUND, ERROR_CODES.SALES_TYPE_NOT_FOUND);
        }
        salesTypeId = generateObjectId(typeIdInput);
      }

      const hasItemUpdates = dto.items !== undefined;

      if (!hasItemUpdates) {
        const updateFields: any = {
          updatedBy: generateObjectId(reqAdmin.userId),
        };

        if (dto.date) {
          updateFields.date = parseVoucherDate(dto.date);
        }
        if (typeIdInput) {
          updateFields.salesTypeId = salesTypeId;
        }
        if (dto.partyId) {
          const party = await this.partyRepository.getPartyById(dto.partyId);
          if (!party || !party.isActive) {
            throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
          }
          updateFields.partyId = generateObjectId(dto.partyId);
        }
        if (dto.dcNo !== undefined) {
          updateFields.dcNo = dto.dcNo.trim();
        }
        if (dto.notes !== undefined) {
          updateFields.notes = dto.notes.trim();
        }
        if (dto.narration !== undefined) {
          updateFields.narration = dto.narration.trim();
        }

        const isGstBill = dto.isGstBill !== undefined ? dto.isGstBill : existingDebitNote.isGstBill;
        updateFields.isGstBill = isGstBill;

        if (isGstBill) {
          const gstPercentage =
            dto.gstPercentage !== undefined
              ? dto.gstPercentage
              : existingDebitNote.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
          const subTotal = existingDebitNote.subTotal || 0;
          const gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
          updateFields.gstPercentage = gstPercentage;
          updateFields.gstAmount = gstAmount;
          updateFields.totalAmount = Number((subTotal + gstAmount).toFixed(2));
        } else {
          updateFields.gstPercentage = 0;
          updateFields.gstAmount = 0;
          updateFields.totalAmount = existingDebitNote.subTotal || 0;
        }

        await this.debitNoteRepository.updateDebitNote(id, updateFields);
        return await this.debitNoteRepository.getDebitNoteById(id);
      }

      // Updating items: Reconcile stock deductions atomically
      if (!dto.items || dto.items.length === 0) {
        throw new HttpException(400, "At least one item is required for debit note", ERROR_CODES.VALIDATION_ERROR);
      }

      let partyId = existingDebitNote.partyId?._id || existingDebitNote.partyId;
      if (dto.partyId) {
        const party = await this.partyRepository.getPartyById(dto.partyId);
        if (!party || !party.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
        }
        partyId = generateObjectId(dto.partyId);
      }

      const preparedItems: any[] = [];
      let subTotal = 0;
      let totalActualQuantity = 0;
      let totalBilledQuantity = 0;
      let primaryCompanyGodownId = dto.companyGodownId || existingDebitNote.companyGodownId?._id || existingDebitNote.companyGodownId;

      const previousDeductions = new Map<string, { actualQty: number; uomQty: number; itemId: string }>();
      for (const oldIt of existingDebitNote.items || []) {
        const sId = (oldIt.godownStockId?._id || oldIt.godownStockId).toString();
        const prev = previousDeductions.get(sId) || { actualQty: 0, uomQty: 0, itemId: (oldIt.itemId?._id || oldIt.itemId).toString() };
        prev.actualQty += Number(oldIt.actualQuantity ?? oldIt.quantity) || 0;
        prev.uomQty += Number(oldIt.uomQuantity) || 0;
        previousDeductions.set(sId, prev);
      }

      const newDeductions = new Map<string, number>();
      for (const itemInput of dto.items) {
        const sId = itemInput.godownStockId;
        const reqQty = Number(itemInput.actualQuantity ?? itemInput.quantity ?? 0);
        newDeductions.set(sId, (newDeductions.get(sId) || 0) + reqQty);
      }

      for (const itemInput of dto.items) {
        const stockDoc: any = await this.godownStockRepository.findById(itemInput.godownStockId);
        if (!stockDoc || stockDoc.isDeleted) {
          throw new HttpException(404, "Godown stock batch not found", ERROR_CODES.NOT_FOUND);
        }

        const sourceGodown = stockDoc.godownId;
        if (!sourceGodown || !sourceGodown.isActive) {
          throw new HttpException(400, "Source godown is inactive or not found", ERROR_CODES.GODOWN_INACTIVE);
        }

        const ownerCompanyGodown = stockDoc.companyGodownId || sourceGodown;
        const canModifyStock = await validateStockModificationAccessWithFetch(
          reqAdmin,
          ownerCompanyGodown,
          this.godownRepository
        );
        if (!canModifyStock) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }

        const hasSourceAccess = compareAdminAndGodownLocation(reqAdmin, sourceGodown);
        if (!hasSourceAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        if (!primaryCompanyGodownId && ownerCompanyGodown) {
          primaryCompanyGodownId = (ownerCompanyGodown._id || ownerCompanyGodown).toString();
        }

        const actualQty = Number(itemInput.actualQuantity ?? itemInput.quantity ?? 0);
        if (actualQty <= 0) {
          throw new HttpException(400, "Actual quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
        }

        const billedQty = Number(itemInput.billedQuantity ?? actualQty);
        if (billedQty <= 0) {
          throw new HttpException(400, "Billed quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
        }

        const sId = itemInput.godownStockId;
        const prevStockDeducted = previousDeductions.get(sId)?.actualQty || 0;
        const totalNewStockForBatch = newDeductions.get(sId) || 0;
        const availableStockReverted = Number(stockDoc.currentStock) + prevStockDeducted;

        const dcNo = (itemInput.dcNo || stockDoc.dcNo || stockDoc.batchNo || "").trim();
        const lotNo = (itemInput.lotNo || stockDoc.lotNo || "").trim();

        if (availableStockReverted < totalNewStockForBatch) {
          throw new HttpException(
            400,
            `Insufficient stock for batch '${lotNo || dcNo || "N/A"}'. Available: ${availableStockReverted}, Total Requested: ${totalNewStockForBatch}`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        let uomQty = 1;
        if (itemInput.uomQuantity !== undefined) {
          const reqUomQty = Number(itemInput.uomQuantity);
          if (reqUomQty <= 0) {
            throw new HttpException(400, "UOM quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
          }
          uomQty = reqUomQty;
        } else if (stockDoc.uomQuantity !== undefined && stockDoc.uomQuantity > 0) {
          uomQty = Number(stockDoc.uomQuantity);
        }

        const rawItemId = stockDoc.itemId?._id || stockDoc.itemId;
        const itemId = rawItemId.toString();

        const rawUom = itemInput.uomId || stockDoc.uomId || stockDoc.itemId?.defaultUomId;
        if (!rawUom) {
          throw new HttpException(400, "UOM is required for debit note item", ERROR_CODES.VALIDATION_ERROR);
        }
        const uomId = ((rawUom as any)._id || rawUom).toString();

        const rawPer = itemInput.perId || stockDoc.perId || stockDoc.itemId?.defaultPerId;
        if (!rawPer) {
          throw new HttpException(400, "Per Unit is required for debit note item", ERROR_CODES.VALIDATION_ERROR);
        }
        const perId = ((rawPer as any)._id || rawPer).toString();

        const perUnitDoc = await this.perUnitRepository.getPerUnitById(perId);
        const multiplier = perUnitDoc?.multiplier && perUnitDoc.multiplier > 0 ? perUnitDoc.multiplier : 1;

        const rate = Number(itemInput.rate);
        if (rate < 0) {
          throw new HttpException(400, "Rate cannot be negative", ERROR_CODES.VALIDATION_ERROR);
        }

        const itemAmount = Number(((billedQty * rate) / multiplier).toFixed(2));

        subTotal += itemAmount;
        totalActualQuantity += actualQty;
        totalBilledQuantity += billedQty;

        preparedItems.push({
          godownStockId: stockDoc._id,
          itemId: generateObjectId(itemId),
          godownId: generateObjectId(sourceGodown._id || sourceGodown),
          companyGodownId: generateObjectId(ownerCompanyGodown._id || ownerCompanyGodown),
          dcNo,
          lotNo,
          uomId: generateObjectId(uomId),
          uomQuantity: uomQty,
          actualQuantity: actualQty,
          billedQuantity: billedQty,
          quantity: actualQty,
          rate,
          perId: generateObjectId(perId),
          amount: itemAmount,
        });
      }

      subTotal = Number(subTotal.toFixed(2));

      const isGstBill = dto.isGstBill !== undefined ? dto.isGstBill : existingDebitNote.isGstBill;
      let gstPercentage = 0;
      let gstAmount = 0;
      let totalAmount = subTotal;

      if (isGstBill) {
        gstPercentage =
          typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
            ? dto.gstPercentage
            : existingDebitNote.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
        gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
        totalAmount = Number((subTotal + gstAmount).toFixed(2));
      }

      await withTransaction(async (session: ClientSession) => {
        // Revert previous deductions
        for (const [sId, info] of previousDeductions.entries()) {
          if (info.actualQty > 0) {
            await this.godownStockRepository.increaseStock(sId, info.actualQty, reqAdmin.userId, session, info.uomQty);
            await this.itemRepository.adjustStockQuantity(info.itemId, info.actualQty, session);
          }
        }

        // Apply new deductions
        for (const it of preparedItems) {
          const updatedStock = await this.godownStockRepository.decreaseStock(
            it.godownStockId,
            it.actualQuantity,
            reqAdmin.userId,
            session,
            it.uomQuantity
          );
          if (!updatedStock) {
            throw new HttpException(
              400,
              `Could not deduct stock for batch '${it.lotNo || it.dcNo || "N/A"}'. Stock may have changed.`,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }
          await this.itemRepository.adjustStockQuantity(it.itemId.toString(), -it.actualQuantity, session);
        }

        const updateFields: any = {
          date: dto.date ? parseVoucherDate(dto.date) : existingDebitNote.date,
          salesTypeId,
          partyId,
          dcNo: dto.dcNo !== undefined ? dto.dcNo.trim() : existingDebitNote.dcNo,
          companyGodownId: primaryCompanyGodownId ? (generateObjectId(primaryCompanyGodownId) as any) : existingDebitNote.companyGodownId,
          items: preparedItems,
          subTotal,
          isGstBill,
          gstPercentage,
          gstAmount,
          totalAmount,
          totalActualQuantity,
          totalBilledQuantity,
          totalQuantity: totalActualQuantity,
          notes: dto.notes !== undefined ? dto.notes.trim() : existingDebitNote.notes,
          narration: dto.narration !== undefined ? dto.narration.trim() : existingDebitNote.narration,
          updatedBy: generateObjectId(reqAdmin.userId),
        };

        await this.debitNoteRepository.updateDebitNote(id, updateFields, session);
      });

      return await this.debitNoteRepository.getDebitNoteById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.DebitNoteUseCase, this.logger);
    }
  }
}
