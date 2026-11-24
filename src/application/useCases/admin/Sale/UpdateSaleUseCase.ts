import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { UpdateSaleDTO } from "@/shared/dto/admin/saleDTO";
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
export class UpdateSaleUseCase {
  constructor(
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateSaleDTO, reqAdmin: ReqAdminDTO) {
    try {
      const existingSale: any = await this.saleRepository.getSaleById(id);
      if (!existingSale || existingSale.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.SALE_NOT_FOUND, ERROR_CODES.SALE_NOT_FOUND);
      }

      // Check access for existing sale's company godown and item godowns
      const currentCompanyGodown = existingSale.companyGodownId;
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

      for (const it of existingSale.items || []) {
        const itGodown = it.godownId;
        if (itGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, itGodown);
          if (!hasAccess) {
            throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      let salesTypeId = existingSale.salesTypeId?._id || existingSale.salesTypeId;
      if (dto.salesTypeId) {
        const salesType = await this.salesTypeRepository.getSalesTypeById(dto.salesTypeId);
        if (!salesType || !salesType.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.SALES_TYPE_NOT_FOUND, ERROR_CODES.SALES_TYPE_NOT_FOUND);
        }
        salesTypeId = generateObjectId(dto.salesTypeId);
      }

      const hasItemUpdates = dto.items !== undefined;

      // Metadata-only update
      if (!hasItemUpdates) {
        const updateFields: any = {
          updatedBy: generateObjectId(reqAdmin.userId),
        };

        if (dto.date) {
          updateFields.date = parseVoucherDate(dto.date);
        }
        if (dto.salesTypeId) {
          updateFields.salesTypeId = salesTypeId;
        }
        if (dto.partyId) {
          const party = await this.partyRepository.getPartyById(dto.partyId);
          if (!party || !party.isActive) {
            throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
          }
          updateFields.partyId = generateObjectId(dto.partyId);
        }
        if (dto.invoiceNo !== undefined) {
          updateFields.invoiceNo = dto.invoiceNo.trim();
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

        if (dto.isGstBill !== undefined || dto.gstPercentage !== undefined) {
          const isGstBill = dto.isGstBill !== undefined ? Boolean(dto.isGstBill) : existingSale.isGstBill;
          let gstPercentage = 0;
          let gstAmount = 0;
          let totalAmount = existingSale.subTotal;

          if (isGstBill) {
            gstPercentage =
              typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
                ? dto.gstPercentage
                : existingSale.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
            gstAmount = Number(((existingSale.subTotal * gstPercentage) / 100).toFixed(2));
            totalAmount = Number((existingSale.subTotal + gstAmount).toFixed(2));
          }

          updateFields.isGstBill = isGstBill;
          updateFields.gstPercentage = gstPercentage;
          updateFields.gstAmount = gstAmount;
          updateFields.totalAmount = totalAmount;
        }

        await this.saleRepository.updateSale(id, updateFields);
        return await this.saleRepository.getSaleById(id);
      }

      // Items updated: validate that at least one item exists
      if (!dto.items || dto.items.length === 0) {
        throw new HttpException(400, "At least one item is required for sale", ERROR_CODES.VALIDATION_ERROR);
      }

      let partyId = existingSale.partyId?._id || existingSale.partyId;
      if (dto.partyId) {
        const party = await this.partyRepository.getPartyById(dto.partyId);
        if (!party || !party.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
        }
        partyId = generateObjectId(dto.partyId);
      }

      // Execute stock reconciliation inside a transaction
      await withTransaction(async (session: ClientSession) => {
        // Step A: Revert old items stock
        for (const oldIt of existingSale.items || []) {
          const oldStockDocId = oldIt.godownStockId?._id || oldIt.godownStockId;
          const oldQty = Number(oldIt.actualQuantity ?? oldIt.quantity) || 0;
          const oldUomQty = Number(oldIt.uomQuantity) || 0;
          const oldItemId = (oldIt.itemId?._id || oldIt.itemId).toString();

          if (oldStockDocId && oldQty > 0) {
            await this.godownStockRepository.increaseStock(
              oldStockDocId,
              oldQty,
              reqAdmin.userId,
              session,
              oldUomQty
            );
          }
          if (oldItemId && oldQty > 0) {
            await this.itemRepository.adjustStockQuantity(oldItemId, oldQty, session);
          }
        }

        // Step B: Validate new items against updated stocks
        const calculatedItems: any[] = [];
        let subTotal = 0;
        let totalActualQuantity = 0;
        let totalBilledQuantity = 0;
        let primaryCompanyGodownId = dto.companyGodownId || (existingSale.companyGodownId?._id || existingSale.companyGodownId)?.toString();

        for (const itemInput of dto.items!) {
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

          const rawUom = itemInput.uomId || stockDoc.uomId || stockDoc.itemId?.defaultUomId;
          const uomId = ((rawUom as any)?._id || rawUom)?.toString();

          const rawPer = itemInput.perId || stockDoc.perId || stockDoc.itemId?.defaultPerId;
          const perId = ((rawPer as any)?._id || rawPer)?.toString();

          const perUnitDoc = perId ? await this.perUnitRepository.getPerUnitById(perId) : null;
          const multiplier = perUnitDoc?.multiplier && perUnitDoc.multiplier > 0 ? perUnitDoc.multiplier : 1;

          const rate = Number(itemInput.rate);
          if (rate < 0) {
            throw new HttpException(400, "Rate cannot be negative", ERROR_CODES.VALIDATION_ERROR);
          }

          const itemDoc = await this.itemRepository.getItemById(itemId);
          const itemHsnCode = (itemInput.hsnCode || itemDoc?.hsnCode || (itemDoc?.hsnCodeId as any)?.hsnCode || "").trim();

          const itemAmount = Number(((billedQty * rate) / multiplier).toFixed(2));

          subTotal += itemAmount;
          totalActualQuantity += actualQty;
          totalBilledQuantity += billedQty;

          calculatedItems.push({
            godownStockId: stockDoc._id,
            itemId: generateObjectId(itemId),
            godownId: generateObjectId(sourceGodown._id || sourceGodown),
            companyGodownId: generateObjectId(ownerCompanyGodown._id || ownerCompanyGodown),
            dcNo,
            lotNo,
            hsnCode: itemHsnCode,
            uomId: uomId ? generateObjectId(uomId) : undefined,
            uomQuantity: uomQty,
            actualQuantity: actualQty,
            billedQuantity: billedQty,
            quantity: actualQty, // legacy alias
            rate,
            perId: perId ? generateObjectId(perId) : undefined,
            amount: itemAmount,
          });
        }

        // Step C: Deduct new items stock by actualQuantity
        for (const it of calculatedItems) {
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

        subTotal = Number(subTotal.toFixed(2));

        const isGstBill = dto.isGstBill !== undefined ? Boolean(dto.isGstBill) : existingSale.isGstBill;
        let gstPercentage = 0;
        let gstAmount = 0;
        let totalAmount = subTotal;

        if (isGstBill) {
          gstPercentage =
            typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
              ? dto.gstPercentage
              : existingSale.gstPercentage || FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
          gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
          totalAmount = Number((subTotal + gstAmount).toFixed(2));
        }

        const updateData: any = {
          salesTypeId,
          partyId,
          companyGodownId: primaryCompanyGodownId ? generateObjectId(primaryCompanyGodownId) : undefined,
          items: calculatedItems,
          subTotal,
          isGstBill,
          gstPercentage,
          gstAmount,
          totalAmount,
          totalActualQuantity,
          totalBilledQuantity,
          totalQuantity: totalActualQuantity,
          updatedBy: generateObjectId(reqAdmin.userId),
        };

        if (dto.date) {
          updateData.date = parseVoucherDate(dto.date);
        }
        if (dto.invoiceNo !== undefined) {
          updateData.invoiceNo = dto.invoiceNo.trim();
        }
        if (dto.dcNo !== undefined) {
          updateData.dcNo = dto.dcNo.trim();
        }
        if (dto.notes !== undefined) {
          updateData.notes = dto.notes.trim();
        }
        if (dto.narration !== undefined) {
          updateData.narration = dto.narration.trim();
        }

        await this.saleRepository.updateSale(id, updateData, session);
      });

      return await this.saleRepository.getSaleById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}
