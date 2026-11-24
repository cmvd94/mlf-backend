import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GetAvailableStockForDebitNoteQueryDTO } from "@/shared/dto/admin/debitNoteDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateGodownQuery, compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetAvailableStockForDebitNoteUseCase {
  constructor(
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetAvailableStockForDebitNoteQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
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

      const stocks = await this.godownStockRepository.getAvailableStocks(
        targetGodownIds,
        dto.itemId,
        dto.search
      );

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

        return {
          godownStockId: s._id?.toString(),
          godownId: s.godownId?._id?.toString() || s.godownId?.toString(),
          godownName: s.godownId?.name || "",
          companyGodownId: s.companyGodownId?._id?.toString() || s.companyGodownId?.toString(),
          itemId: itId,
          itemName: s.itemId?.name || "",
          itemCode: s.itemId?.itemCode || "",
          dcNo,
          lotNo,
          batchNo: dcNo,
          currentStock: Number(s.currentStock) || 0,
          uomQuantity: Number(s.uomQuantity) || 1,
          rate,
          uomId: s.uomId?._id?.toString() || s.uomId?.toString() || s.itemId?.defaultUomId?.toString() || "",
          uomName: s.uomId?.name || "",
          uomSymbol: s.uomId?.symbol || "",
          perId: s.perId?._id?.toString() || s.perId?.toString() || s.itemId?.defaultPerId?.toString() || "",
          perName: s.perId?.name || "",
          perSymbol: s.perId?.symbol || "",
          multiplier: Number(s.perId?.multiplier) || 1,
        };
      });
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.DebitNoteUseCase, this.logger);
    }
  }
}
