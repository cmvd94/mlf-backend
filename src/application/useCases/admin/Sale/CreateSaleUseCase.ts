import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreateSaleDTO } from "@/shared/dto/admin/saleDTO";
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
export class CreateSaleUseCase {
  constructor(
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateSaleDTO, reqAdmin: ReqAdminDTO) {
    try {
      if (!dto.items || dto.items.length === 0) {
        throw new HttpException(400, "At least one item is required for sale", ERROR_CODES.VALIDATION_ERROR);
      }

      // 1. Verify Sales Type
      const salesType = await this.salesTypeRepository.getSalesTypeById(dto.salesTypeId);
      if (!salesType || !salesType.isActive) {
        throw new HttpException(404, ERROR_MESSAGES.SALES_TYPE_NOT_FOUND, ERROR_CODES.SALES_TYPE_NOT_FOUND);
      }

      // 2. Verify party (buyer/customer)
      const party = await this.partyRepository.getPartyById(dto.partyId);
      if (!party || !party.isActive) {
        throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
      }

      const saleObjectId = generateObjectId();
      const preparedItems: any[] = [];
      let subTotal = 0;
      let totalActualQuantity = 0;
      let totalBilledQuantity = 0;
      let primaryCompanyGodownId = dto.companyGodownId;

      // 3. Validate each item line against godownStock doc and permissions
      for (const itemInput of dto.items) {
        const stockDoc: any = await this.godownStockRepository.findById(itemInput.godownStockId);
        if (!stockDoc || stockDoc.isDeleted) {
          throw new HttpException(404, "Godown stock batch not found", ERROR_CODES.NOT_FOUND);
        }

        const sourceGodown = stockDoc.godownId;
        if (!sourceGodown || !sourceGodown.isActive) {
          throw new HttpException(400, "Source godown is inactive or not found", ERROR_CODES.GODOWN_INACTIVE);
        }

        // Validate stock modification permission on the company godown that owns this stock
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

        // Hierarchy and regional access check on source godown
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

        const currentStockNum = Number(stockDoc.currentStock) || 0;
        const dcNo = (itemInput.dcNo || stockDoc.dcNo || stockDoc.batchNo || "").trim();
        const lotNo = (itemInput.lotNo || stockDoc.lotNo || "").trim();

        if (currentStockNum < actualQty) {
          throw new HttpException(
            400,
            `Insufficient stock for batch '${lotNo || dcNo || "N/A"}'. Available: ${currentStockNum}, Requested: ${actualQty}`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        // Validate UOM quantity
        let uomQty = 1;
        if (itemInput.uomQuantity !== undefined) {
          const reqUomQty = Number(itemInput.uomQuantity);
          if (reqUomQty <= 0) {
            throw new HttpException(400, "UOM quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
          }
          if (stockDoc.uomQuantity !== undefined && stockDoc.uomQuantity > 0 && reqUomQty > Number(stockDoc.uomQuantity)) {
            throw new HttpException(
              400,
              `Insufficient UOM quantity for batch '${lotNo || dcNo || "N/A"}'. Available: ${stockDoc.uomQuantity}, Requested: ${reqUomQty}`,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }
          uomQty = reqUomQty;
        } else if (stockDoc.uomQuantity !== undefined && stockDoc.uomQuantity > 0) {
          uomQty = Number(stockDoc.uomQuantity);
        }

        const rawItemId = stockDoc.itemId?._id || stockDoc.itemId;
        const itemId = rawItemId.toString();

        // Resolve UOM: from input or stock doc or item default
        const rawUom = itemInput.uomId || stockDoc.uomId || stockDoc.itemId?.defaultUomId;
        if (!rawUom) {
          throw new HttpException(400, "UOM is required for sale item", ERROR_CODES.VALIDATION_ERROR);
        }
        const uomId = ((rawUom as any)._id || rawUom).toString();

        // Resolve PerUnit: from input or stock doc or item default
        const rawPer = itemInput.perId || stockDoc.perId || stockDoc.itemId?.defaultPerId;
        if (!rawPer) {
          throw new HttpException(400, "Per Unit is required for sale item", ERROR_CODES.VALIDATION_ERROR);
        }
        const perId = ((rawPer as any)._id || rawPer).toString();

        const perUnitDoc = await this.perUnitRepository.getPerUnitById(perId);
        const multiplier = perUnitDoc?.multiplier && perUnitDoc.multiplier > 0 ? perUnitDoc.multiplier : 1;

        const rate = Number(itemInput.rate);
        if (rate < 0) {
          throw new HttpException(400, "Rate cannot be negative", ERROR_CODES.VALIDATION_ERROR);
        }

        // Amount calculation done strictly in backend using billed quantity
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
          quantity: actualQty, // legacy alias
          rate,
          perId: generateObjectId(perId),
          amount: itemAmount,
        });
      }

      subTotal = Number(subTotal.toFixed(2));

      // Financial GST calculation
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

      // 4. Atomically deduct stock from godownStock docs & items, generate sequence, and create Sale
      await withTransaction(async (session: ClientSession) => {
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

          // Adjust aggregate item stock by actualQuantity
          await this.itemRepository.adjustStockQuantity(it.itemId.toString(), -it.actualQuantity, session);
        }

        // Generate sequential Sale number
        const seq = await this.counterRepository.getNextSequence("SALES_NUMBER", this.logger, session);
        const salesNumber = `SAL_${seq.toString().padStart(4, "0")}`;

        await this.saleRepository.createSale(
          {
            _id: saleObjectId,
            salesNumber,
            date: parseVoucherDate(dto.date),
            salesTypeId: generateObjectId(dto.salesTypeId) as any,
            partyId: generateObjectId(dto.partyId) as any,
            dcNo: dto.dcNo?.trim() || "",
            companyGodownId: primaryCompanyGodownId ? (generateObjectId(primaryCompanyGodownId) as any) : undefined,
            items: preparedItems,
            subTotal,
            isGstBill,
            gstPercentage,
            gstAmount,
            totalAmount,
            totalActualQuantity,
            totalBilledQuantity,
            totalQuantity: totalActualQuantity,
            notes: dto.notes?.trim() || "",
            narration: dto.narration?.trim() || dto.notes?.trim() || "",
            isActive: true,
            createdBy: generateObjectId(reqAdmin.userId) as any,
          },
          session
        );
      });

      return await this.saleRepository.getSaleById(saleObjectId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}
