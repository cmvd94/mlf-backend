import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CreditNoteRepository } from "@/infrastructure/repositories/admin/CreditNoteRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { UpdateCreditNoteDTO } from "@/shared/dto/admin/creditNoteDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { parseVoucherDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { FINANCIAL_CONFIG } from "@/shared/constants/financialConfig";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import { GodownType } from "@/domain/entities/admin/Godown";
import { StockSourceType } from "@/domain/entities/admin/GodownStock";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class UpdateCreditNoteUseCase {
  constructor(
    @inject(CreditNoteRepository) private creditNoteRepository: CreditNoteRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateCreditNoteDTO, reqAdmin: ReqAdminDTO) {
    try {
      const existingCreditNote: any = await this.creditNoteRepository.getCreditNoteById(id);
      if (!existingCreditNote || existingCreditNote.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.CREDIT_NOTE_NOT_FOUND, ERROR_CODES.CREDIT_NOTE_NOT_FOUND);
      }

      const currentCompanyGodown = existingCreditNote.companyGodownId || existingCreditNote.godownId;
      if (currentCompanyGodown) {
        const hasCompanyAccess = await validateStockModificationAccessWithFetch(
          reqAdmin,
          currentCompanyGodown,
          this.godownRepository
        );
        if (!hasCompanyAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      for (const it of existingCreditNote.items || []) {
        const itGodown = it.godownId;
        if (itGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, itGodown);
          if (!hasAccess) {
            throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };

      let activeCompanyGodown = currentCompanyGodown;
      if (dto.companyGodownId) {
        const newCompanyGodown = await this.godownRepository.findGodownById(dto.companyGodownId);
        if (!newCompanyGodown || newCompanyGodown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!newCompanyGodown.isActive) {
          throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
        }
        if (newCompanyGodown.type !== GodownType.COMPANY_GODOWN) {
          throw new HttpException(400, ERROR_MESSAGES.COMPANY_GODOWN_INVALID, ERROR_CODES.COMPANY_GODOWN_INVALID);
        }
        const hasAccess = await validateStockModificationAccessWithFetch(reqAdmin, newCompanyGodown, this.godownRepository);
        if (!hasAccess) {
          throw new HttpException(403, ERROR_MESSAGES.STOCK_MODIFICATION_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }
        updateData.companyGodownId = newCompanyGodown._id;
        activeCompanyGodown = newCompanyGodown;
      }

      if (dto.partyId) {
        const party = await this.partyRepository.getPartyById(dto.partyId);
        if (!party || !party.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
        }
        updateData.partyId = generateObjectId(dto.partyId);
      }

      const typeId = dto.creditNoteTypeId || dto.purchaseTypeId;
      if (typeId) {
        const purchaseType = await this.purchaseTypeRepository.getPurchaseTypeById(typeId);
        if (!purchaseType || !purchaseType.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND, ERROR_CODES.PURCHASE_TYPE_NOT_FOUND);
        }
        updateData.purchaseTypeId = generateObjectId(typeId);
      }

      if (dto.date) {
        updateData.date = parseVoucherDate(dto.date);
      }
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes.trim();
      }

      if (dto.items === undefined) {
        // Metadata only update
        const isGstBill = dto.isGstBill !== undefined ? dto.isGstBill : existingCreditNote.isGstBill;
        updateData.isGstBill = isGstBill;

        if (isGstBill) {
          const gstPercentage =
            dto.gstPercentage !== undefined
              ? dto.gstPercentage
              : existingCreditNote.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
          const subTotal = existingCreditNote.subTotal || 0;
          const gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
          updateData.gstPercentage = gstPercentage;
          updateData.gstAmount = gstAmount;
          updateData.totalAmount = Number((subTotal + gstAmount).toFixed(2));
        } else {
          updateData.gstPercentage = 0;
          updateData.gstAmount = 0;
          updateData.totalAmount = existingCreditNote.subTotal || 0;
        }

        await this.creditNoteRepository.updateCreditNote(id, updateData);
        return await this.creditNoteRepository.getCreditNoteById(id);
      }

      // Updating items array
      const rawItems = dto.items;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new HttpException(400, "At least one item is required in credit note", ERROR_CODES.VALIDATION_ERROR);
      }

      const calculatedItems: any[] = [];
      let subTotal = 0;
      let totalActualQuantity = 0;
      let totalBilledQuantity = 0;

      for (const itemDto of rawItems) {
        const targetGodownId = itemDto.godownId || (activeCompanyGodown?._id || activeCompanyGodown).toString();

        const godown = await this.godownRepository.findGodownById(targetGodownId);
        if (!godown || godown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!godown.isActive) {
          throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
        }
        const hasAccess = compareAdminAndGodownLocation(reqAdmin, godown);
        if (!hasAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        const item = await this.itemRepository.getItemById(itemDto.itemId);
        if (!item || !item.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.ITEM_NOT_FOUND, ERROR_CODES.ITEM_NOT_FOUND);
        }

        const uom = await this.uomRepository.getUomById(itemDto.uomId);
        if (!uom || !uom.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.UOM_NOT_FOUND, ERROR_CODES.UOM_NOT_FOUND);
        }

        const perUnit = await this.perUnitRepository.getPerUnitById(itemDto.perId);
        if (!perUnit || !perUnit.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PER_UNIT_NOT_FOUND, ERROR_CODES.PER_UNIT_NOT_FOUND);
        }

        const multiplier = perUnit.multiplier && perUnit.multiplier > 0 ? perUnit.multiplier : 1;
        const itemAmount = Number(((itemDto.billedQuantity * itemDto.rate) / multiplier).toFixed(2));
        const actualQty = Number(itemDto.actualQuantity);
        const billedQty = Number(itemDto.billedQuantity);
        const uomQty = Number(itemDto.uomQuantity || actualQty || 1);

        subTotal += itemAmount;
        totalActualQuantity += actualQty;
        totalBilledQuantity += billedQty;

        calculatedItems.push({
          _id: itemDto._id ? generateObjectId(itemDto._id) : generateObjectId(),
          itemId: generateObjectId(itemDto.itemId) as any,
          godownId: generateObjectId(targetGodownId) as any,
          companyGodownId: activeCompanyGodown?._id || activeCompanyGodown,
          dcNo: (itemDto.dcNo || itemDto.batchNo || "").trim(),
          lotNo: itemDto.lotNo?.trim() || "",
          uomId: generateObjectId(itemDto.uomId) as any,
          uomQuantity: uomQty,
          actualQuantity: actualQty,
          billedQuantity: billedQty,
          rate: Number(itemDto.rate),
          perId: generateObjectId(itemDto.perId) as any,
          amount: itemAmount,
          godownStockId: itemDto.godownStockId ? generateObjectId(itemDto.godownStockId) : undefined,
        });
      }

      subTotal = Number(subTotal.toFixed(2));

      const isGstBill = dto.isGstBill !== undefined ? Boolean(dto.isGstBill) : existingCreditNote.isGstBill;
      let gstPercentage = 0;
      let gstAmount = 0;
      let totalAmount = subTotal;

      if (isGstBill) {
        gstPercentage =
          typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
            ? dto.gstPercentage
            : existingCreditNote.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
        gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
        totalAmount = Number((subTotal + gstAmount).toFixed(2));
      }

      updateData.items = calculatedItems;
      updateData.subTotal = subTotal;
      updateData.isGstBill = isGstBill;
      updateData.gstPercentage = gstPercentage;
      updateData.gstAmount = gstAmount;
      updateData.totalAmount = totalAmount;
      updateData.totalActualQuantity = totalActualQuantity;
      updateData.totalBilledQuantity = totalBilledQuantity;

      // Reconcile stock docs in a transaction
      await withTransaction(async (session: ClientSession) => {
        const existingStockDocs = await this.godownStockRepository.findByCreditNoteId(existingCreditNote._id);
        const existingStockMap = new Map<string, any>();
        for (const doc of existingStockDocs) {
          existingStockMap.set(doc._id.toString(), doc);
        }

        for (const oldIt of existingCreditNote.items || []) {
          const oldItemId = (oldIt.itemId?._id || oldIt.itemId).toString();
          const oldQty = Number(oldIt.actualQuantity) || 0;
          await this.itemRepository.adjustStockQuantity(oldItemId, -oldQty, session);
        }

        for (const calcIt of calculatedItems) {
          const stockId = calcIt.godownStockId ? calcIt.godownStockId.toString() : null;
          if (stockId && existingStockMap.has(stockId)) {
            const existingDoc = existingStockMap.get(stockId);
            const stockDiff = calcIt.actualQuantity - (existingDoc.initialStock ?? existingDoc.currentStock);
            const newCurrentStock = existingDoc.currentStock + stockDiff;
            if (newCurrentStock < 0) {
              throw new HttpException(
                400,
                `Cannot update credit note item '${calcIt.lotNo || calcIt.dcNo}': consumed stock exceeds available stock`,
                ERROR_CODES.INSUFFICIENT_STOCK
              );
            }

            await this.godownStockRepository.updateBatchStock(
              stockId,
              {
                godownId: calcIt.godownId,
                companyGodownId: calcIt.companyGodownId,
                itemId: calcIt.itemId,
                dcNo: calcIt.dcNo,
                lotNo: calcIt.lotNo,
                currentStock: newCurrentStock,
                initialStock: calcIt.actualQuantity,
                rate: calcIt.rate,
                uomId: calcIt.uomId,
                uomQuantity: calcIt.uomQuantity,
                perId: calcIt.perId,
                updatedBy: reqAdmin.userId,
              },
              session
            );
            existingStockMap.delete(stockId);
          } else {
            const newStockDoc = await this.godownStockRepository.createBatchStock(
              {
                godownId: calcIt.godownId,
                companyGodownId: calcIt.companyGodownId,
                itemId: calcIt.itemId,
                dcNo: calcIt.dcNo,
                lotNo: calcIt.lotNo,
                currentStock: calcIt.actualQuantity,
                initialStock: calcIt.actualQuantity,
                rate: calcIt.rate,
                uomId: calcIt.uomId,
                uomQuantity: calcIt.uomQuantity,
                perId: calcIt.perId,
                creditNoteId: existingCreditNote._id,
                sourceType: StockSourceType.CREDIT_NOTE,
                createdBy: reqAdmin.userId,
                updatedBy: reqAdmin.userId,
              },
              session
            );
            calcIt.godownStockId = newStockDoc._id;
          }

          await this.itemRepository.adjustStockQuantity(
            calcIt.itemId.toString(),
            calcIt.actualQuantity,
            session
          );
        }

        // Remove deleted items' stock docs
        for (const [stkId, doc] of existingStockMap.entries()) {
          if (doc.currentStock < (doc.initialStock ?? doc.currentStock)) {
            throw new HttpException(
              400,
              `Cannot delete item with DC '${doc.dcNo}': stock already consumed`,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }
          await this.godownStockRepository.deleteByCreditNoteId(existingCreditNote._id, reqAdmin.userId, session);
        }

        await this.creditNoteRepository.updateCreditNote(id, updateData, session);
      });

      return await this.creditNoteRepository.getCreditNoteById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.CreditNoteUseCase, this.logger);
    }
  }
}
