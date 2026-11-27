import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { GetAvailableStockForSaleQueryDTO } from "@/shared/dto/admin/saleDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateGodownQuery, compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetAvailableStockForSaleUseCase {
  constructor(
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetAvailableStockForSaleQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Regional access scope check
      const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
      if (!hasAccess) {
        throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
      }

      const accessibleGodowns = await this.godownRepository.getAllGodownsByQuery(godownQuery);
      const accessibleGodownMap = new Map<string, any>();
      for (const g of accessibleGodowns) {
        accessibleGodownMap.set(g._id.toString(), g);
      }

      let targetGodownIds = Array.from(accessibleGodownMap.keys());

      if (dto.godownId && dto.godownId.trim().length > 0) {
        const singleGodown = await this.godownRepository.findGodownById(dto.godownId.trim());
        if (!singleGodown || singleGodown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        const canAccess = compareAdminAndGodownLocation(reqAdmin, singleGodown);
        if (!canAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }
        targetGodownIds = [singleGodown._id.toString()];
      }

      if (targetGodownIds.length === 0) {
        return [];
      }

      let existingSaleItems: any[] = [];
      let saleStockIds: string[] = [];
      if (dto.saleId && dto.saleId.trim().length > 0) {
        const sale: any = await this.saleRepository.getSaleById(dto.saleId.trim());
        if (sale && !sale.isDeleted) {
          existingSaleItems = sale.items || [];
          saleStockIds = existingSaleItems
            .map((it) => (it.godownStockId?._id || it.godownStockId)?.toString())
            .filter(Boolean);
        }
      }

      const stocks = await this.godownStockRepository.getAvailableStocks(
        targetGodownIds,
        dto.itemId,
        dto.search,
        undefined,
        saleStockIds
      );

      // Filter stocks by company godown ownership & stock modification permission
      const stockAccessChecks = await Promise.all(
        stocks.map(async (s: any) => {
          const ownerGodown = s.companyGodownId || s.godownId;
          if (!ownerGodown) return false;
          return await validateStockModificationAccessWithFetch(
            reqAdmin,
            ownerGodown,
            this.godownRepository
          );
        })
      );
      const authorizedStocks = stocks.filter((_, idx) => stockAccessChecks[idx]);

      return authorizedStocks.map((s: any) => {
        let rate = Number(s.rate) || 0;
        const dcNo = (s.dcNo || s.batchNo || "").trim();
        const lotNo = (s.lotNo || "").trim();
        const itId = s.itemId?._id?.toString() || s.itemId?.toString() || "";

        if (rate <= 0 && s.purchaseId?.items) {
          const pItem = s.purchaseId.items.find((it: any) =>
            (it.dcNo && it.dcNo.trim() === dcNo) ||
            (it.batchNo && it.batchNo.trim() === dcNo) ||
            (it.itemId && it.itemId.toString() === itId)
          );
          if (pItem) rate = Number(pItem.rate) || 0;
        }

        if (rate <= 0 && s.stockTransferId?.destinationItems) {
          const dItem = s.stockTransferId.destinationItems.find((it: any) =>
            (it.dcNo && it.dcNo.trim() === dcNo) ||
            (it.batchNo && it.batchNo.trim() === dcNo) ||
            (it.itemId && it.itemId.toString() === itId)
          );
          if (dItem && Number(dItem.rate) > 0) {
            rate = Number(dItem.rate);
          } else if (s.stockTransferId?.sourceItems && s.stockTransferId.sourceItems.length > 0) {
            rate = Number(s.stockTransferId.sourceItems[0].rate) || 0;
          }
        }

        if (rate <= 0 && s.itemId?.standardRate) {
          rate = Number(s.itemId.standardRate) || 0;
        }

        let addedQty = 0;
        let addedUomQty = 0;
        for (const it of existingSaleItems) {
          const itStockId = (it.godownStockId?._id || it.godownStockId)?.toString();
          if (itStockId === s._id.toString()) {
            addedQty += Number(it.actualQuantity ?? it.quantity ?? 0);
            addedUomQty += Number(it.uomQuantity ?? 0);
          }
        }

        const currentStockVal = Number(s.currentStock || 0);
        const currentUomVal = typeof s.uomQuantity === "number" ? s.uomQuantity : (Number(s.uomQuantity) || 0);
        const qty = Number((currentStockVal + addedQty).toFixed(4));
        const uomQuantity = Number((currentUomVal + addedUomQty).toFixed(4));
        const amount = Number((qty * rate).toFixed(2));

        return {
          godownStockId: s._id.toString(),
          godownId: s.godownId?._id?.toString() || s.godownId?.toString() || "",
          godownName: s.godownId?.name || "Unknown Godown",
          godownCode: s.godownId?.code || s.godownId?.godownId || "",
          companyGodownId: s.companyGodownId?._id?.toString() || s.companyGodownId?.toString() || "",
          companyGodownName: s.companyGodownId?.name || "",
          companyGodownCode: s.companyGodownId?.godownId || "",
          itemId: itId,
          itemName: s.itemId?.name || "Unknown Item",
          itemCode: s.itemId?.itemCode || "",
          dcNo,
          lotNo,
          batchNo: dcNo,
          currentStock: qty,
          rate,
          amount,
          uomId: s.uomId?._id?.toString() || s.uomId?.toString() || "",
          uomName: s.uomId?.name || "",
          uomSymbol: s.uomId?.symbol || "",
          uomQuantity,
          perId: s.perId?._id?.toString() || s.perId?.toString() || s.itemId?.defaultPerId?._id?.toString() || s.itemId?.defaultPerId?.toString() || "",
          perName: s.perId?.name || s.itemId?.defaultPerId?.name || "",
          perSymbol: s.perId?.symbol || s.itemId?.defaultPerId?.symbol || "",
          perMultiplier: s.perId?.multiplier || s.itemId?.defaultPerId?.multiplier || 1,
        };
      });
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}
