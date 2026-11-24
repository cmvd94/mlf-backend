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
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreateCreditNoteDTO, CreateCreditNoteItemDTO } from "@/shared/dto/admin/creditNoteDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation, validateStockModificationAccess } from "@/shared/utils/godownQueryHelper";
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
export class CreateCreditNoteUseCase {
  constructor(
    @inject(CreditNoteRepository) private creditNoteRepository: CreditNoteRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateCreditNoteDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Verify party
      const party = await this.partyRepository.getPartyById(dto.partyId);
      if (!party || !party.isActive) {
        throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
      }

      // 2. Verify purchase type / credit note type if supplied
      const typeId = dto.creditNoteTypeId || dto.purchaseTypeId;
      if (typeId) {
        const purchaseType = await this.purchaseTypeRepository.getPurchaseTypeById(typeId);
        if (!purchaseType || !purchaseType.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND, ERROR_CODES.PURCHASE_TYPE_NOT_FOUND);
        }
      }

      // 3. Mandatory Company Godown verification & stock modification permission
      const companyGodownIdInput = dto.companyGodownId || dto.godownId;
      if (!companyGodownIdInput) {
        throw new HttpException(400, ERROR_MESSAGES.COMPANY_GODOWN_REQUIRED, ERROR_CODES.COMPANY_GODOWN_REQUIRED);
      }

      const companyGodown = await this.godownRepository.findGodownById(companyGodownIdInput);
      if (!companyGodown || companyGodown.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
      }
      if (!companyGodown.isActive) {
        throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
      }
      if (companyGodown.type !== GodownType.COMPANY_GODOWN) {
        throw new HttpException(400, ERROR_MESSAGES.COMPANY_GODOWN_INVALID, ERROR_CODES.COMPANY_GODOWN_INVALID);
      }

      const hasCompanyGodownAccess = validateStockModificationAccess(reqAdmin, companyGodown);
      if (!hasCompanyGodownAccess) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
          ERROR_CODES.GODOWN_ACCESS_DENIED
        );
      }

      let rawItems: CreateCreditNoteItemDTO[] = dto.items;
      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        if (dto.itemId && dto.uomId && dto.actualQuantity && dto.billedQuantity && dto.perId) {
          rawItems = [
            {
              itemId: dto.itemId,
              godownId: (dto.godownId || companyGodown._id.toString()) as string,
              uomId: dto.uomId,
              uomQuantity: dto.uomQuantity ?? dto.actualQuantity ?? 1,
              actualQuantity: dto.actualQuantity,
              billedQuantity: dto.billedQuantity,
              rate: dto.rate ?? 0,
              perId: dto.perId,
            },
          ];
        } else {
          throw new HttpException(400, "At least one item is required in credit note", ERROR_CODES.VALIDATION_ERROR);
        }
      }

      const calculatedItems: any[] = [];
      let subTotal = 0;
      let totalActualQuantity = 0;
      let totalBilledQuantity = 0;

      for (const itemDto of rawItems) {
        const targetGodownId = itemDto.godownId || companyGodown._id.toString();

        const godown = await this.godownRepository.findGodownById(targetGodownId);
        if (!godown || godown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!godown.isActive) {
          throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
        }

        const hasAccess = compareAdminAndGodownLocation(reqAdmin, godown);
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
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
          itemId: generateObjectId(itemDto.itemId) as any,
          godownId: generateObjectId(targetGodownId) as any,
          companyGodownId: companyGodown._id,
          dcNo: (itemDto.dcNo || itemDto.batchNo || "").trim(),
          lotNo: itemDto.lotNo?.trim() || "",
          uomId: generateObjectId(itemDto.uomId) as any,
          uomQuantity: uomQty,
          actualQuantity: actualQty,
          billedQuantity: billedQty,
          rate: Number(itemDto.rate),
          perId: generateObjectId(itemDto.perId) as any,
          amount: itemAmount,
        });
      }

      subTotal = Number(subTotal.toFixed(2));

      const isGstBill = Boolean(dto.isGstBill);
      let gstPercentage = 0;
      let gstAmount = 0;
      let totalAmount = subTotal;

      if (isGstBill) {
        gstPercentage =
          typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
            ? dto.gstPercentage
            : FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
        gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
        totalAmount = Number((subTotal + gstAmount).toFixed(2));
      }

      const creditNoteObjectId = generateObjectId();

      await withTransaction(async (session: ClientSession) => {
        const seq = await this.counterRepository.getNextSequence("CREDIT_NOTE_NUMBER", this.logger, session);
        const creditNoteNumber = `CN_${seq.toString().padStart(4, "0")}`;

        for (const calculatedItem of calculatedItems) {
          const stockDoc = await this.godownStockRepository.createBatchStock(
            {
              godownId: calculatedItem.godownId,
              companyGodownId: companyGodown._id,
              itemId: calculatedItem.itemId,
              dcNo: calculatedItem.dcNo,
              lotNo: calculatedItem.lotNo,
              currentStock: calculatedItem.actualQuantity,
              initialStock: calculatedItem.actualQuantity,
              rate: calculatedItem.rate,
              uomId: calculatedItem.uomId,
              uomQuantity: calculatedItem.uomQuantity,
              perId: calculatedItem.perId,
              creditNoteId: creditNoteObjectId,
              sourceType: StockSourceType.CREDIT_NOTE,
              createdBy: reqAdmin.userId,
              updatedBy: reqAdmin.userId,
            },
            session
          );

          (calculatedItem as any).godownStockId = stockDoc._id;

          await this.itemRepository.adjustStockQuantity(
            calculatedItem.itemId.toString(),
            calculatedItem.actualQuantity,
            session
          );
        }

        await this.creditNoteRepository.createCreditNote(
          {
            _id: creditNoteObjectId,
            creditNoteNumber,
            date: parseVoucherDate(dto.date),
            partyId: generateObjectId(dto.partyId) as any,
            purchaseTypeId: typeId ? (generateObjectId(typeId) as any) : undefined,
            companyGodownId: companyGodown._id,
            godownId: companyGodown._id,
            items: calculatedItems,
            subTotal,
            isGstBill,
            gstPercentage,
            gstAmount,
            totalAmount,
            totalActualQuantity,
            totalBilledQuantity,
            itemId: calculatedItems[0].itemId,
            dcNo: calculatedItems[0].dcNo,
            lotNo: calculatedItems[0].lotNo,
            uomId: calculatedItems[0].uomId,
            uomQuantity: calculatedItems[0].uomQuantity,
            actualQuantity: calculatedItems[0].actualQuantity,
            billedQuantity: calculatedItems[0].billedQuantity,
            rate: calculatedItems[0].rate,
            perId: calculatedItems[0].perId,
            amount: totalAmount,
            godownStockId: (calculatedItems[0] as any).godownStockId,
            notes: dto.notes?.trim() || "",
            isActive: true,
            createdBy: generateObjectId(reqAdmin.userId),
          },
          session
        );
      });

      return await this.creditNoteRepository.getCreditNoteById(creditNoteObjectId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.CreditNoteUseCase, this.logger);
    }
  }
}
