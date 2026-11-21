import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreatePurchaseDTO, CreatePurchaseItemDTO } from "@/shared/dto/admin/purchaseDTO";
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
export class CreatePurchaseUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
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

  async execute(dto: CreatePurchaseDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Verify party
      const party = await this.partyRepository.getPartyById(dto.partyId);
      if (!party || !party.isActive) {
        throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
      }

      // 2. Verify purchase type
      const purchaseType = await this.purchaseTypeRepository.getPurchaseTypeById(dto.purchaseTypeId);
      if (!purchaseType || !purchaseType.isActive) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND, ERROR_CODES.PURCHASE_TYPE_NOT_FOUND);
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

      // Normalize items list (supports both items array and legacy single item)
      let rawItems: CreatePurchaseItemDTO[] = dto.items;
      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        if (dto.itemId && dto.uomId && dto.actualQuantity && dto.billedQuantity && dto.perId) {
          rawItems = [
            {
              itemId: dto.itemId,
              godownId: (dto.godownId || "") as string,
              uomId: dto.uomId,
              uomQuantity: dto.uomQuantity ?? dto.actualQuantity ?? 1,
              actualQuantity: dto.actualQuantity,
              billedQuantity: dto.billedQuantity,
              rate: dto.rate ?? 0,
              perId: dto.perId,
            },
          ];
        } else {
          throw new HttpException(400, "At least one item is required in purchase", ERROR_CODES.VALIDATION_ERROR);
        }
      }

      // 3. Validate each item line including its individual assigned delivered godown & hierarchy access
      const calculatedItems: any[] = [];
      let subTotal = 0;
      let totalActualQuantity = 0;
      let totalBilledQuantity = 0;

      for (const itemDto of rawItems) {
        const targetGodownId = itemDto.godownId;
        if (!targetGodownId) {
          throw new HttpException(400, "Godown ID is required for each item", ERROR_CODES.VALIDATION_ERROR);
        }

        // Verify assigned delivered godown for this item
        const godown = await this.godownRepository.findGodownById(targetGodownId);
        if (!godown || godown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!godown.isActive) {
          throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
        }

        // Hierarchy and regional access scope check for this godown
        const hasAccess = compareAdminAndGodownLocation(reqAdmin, godown);
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }

        // Verify item
        const item = await this.itemRepository.getItemById(itemDto.itemId);
        if (!item || !item.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.ITEM_NOT_FOUND, ERROR_CODES.ITEM_NOT_FOUND);
        }

        // Verify UOM
        const uom = await this.uomRepository.getUomById(itemDto.uomId);
        if (!uom || !uom.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.UOM_NOT_FOUND, ERROR_CODES.UOM_NOT_FOUND);
        }

        // Verify PerUnit
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
          batchNo: itemDto.batchNo?.trim() || "",
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

      // Calculate GST if enabled
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

      // 4. Atomically generate sequence, create stock batches, update item stocks, and create purchase
      const purchaseObjectId = generateObjectId();

      await withTransaction(async (session: ClientSession) => {
        const seq = await this.counterRepository.getNextSequence("PURCHASE_NUMBER", this.logger, session);
        const purchaseNumber = `PUR_${seq.toString().padStart(4, "0")}`;

        // Create a GodownStock document for each purchase item with batch number & important stock info
        for (const calculatedItem of calculatedItems) {
          const stockDoc = await this.godownStockRepository.createBatchStock(
            {
              godownId: calculatedItem.godownId,
              companyGodownId: companyGodown._id,
              itemId: calculatedItem.itemId,
              batchNo: calculatedItem.batchNo,
              currentStock: calculatedItem.actualQuantity,
              initialStock: calculatedItem.actualQuantity,
              uomId: calculatedItem.uomId,
              uomQuantity: calculatedItem.uomQuantity,
              perId: calculatedItem.perId,
              purchaseId: purchaseObjectId,
              sourceType: StockSourceType.PURCHASE,
              createdBy: reqAdmin.userId,
              updatedBy: reqAdmin.userId,
            },
            session
          );

          // Store its _id in the item line
          (calculatedItem as any).godownStockId = stockDoc._id;

          // Also maintain aggregate item stock
          await this.itemRepository.adjustStockQuantity(
            calculatedItem.itemId.toString(),
            calculatedItem.actualQuantity,
            session
          );
        }

        // Create Purchase entry with individual item godown assignments and godownStockId references
        await this.purchaseRepository.createPurchase(
          {
            _id: purchaseObjectId,
            purchaseNumber,
            date: parseVoucherDate(dto.date),
            partyId: generateObjectId(dto.partyId) as any,
            purchaseTypeId: generateObjectId(dto.purchaseTypeId) as any,
            companyGodownId: companyGodown._id,
            godownId: companyGodown._id, // Legacy compatibility
            items: calculatedItems,
            subTotal,
            isGstBill,
            gstPercentage,
            gstAmount,
            totalAmount,
            totalActualQuantity,
            totalBilledQuantity,
            // Legacy single item fields mirror for first item
            itemId: calculatedItems[0].itemId,
            batchNo: calculatedItems[0].batchNo,
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

      // 5. Return complete saved purchase record
      return await this.purchaseRepository.getPurchaseById(purchaseObjectId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
