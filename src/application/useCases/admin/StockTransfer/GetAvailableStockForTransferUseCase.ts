import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GetAvailableStockQueryDTO } from "@/shared/dto/admin/stockTransferDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetAvailableStockForTransferUseCase {
  constructor(
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetAvailableStockQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      // Regional access scope check
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

      return stocks.map((s: any) => ({
        godownStockId: s._id.toString(),
        godownId: s.godownId?._id?.toString() || s.godownId?.toString(),
        godownName: s.godownId?.name || "Unknown Godown",
        godownCode: s.godownId?.code || "",
        itemId: s.itemId?._id?.toString() || s.itemId?.toString(),
        itemName: s.itemId?.name || "Unknown Item",
        itemCode: s.itemId?.itemCode || "",
        batchNo: s.batchNo || "",
        currentStock: s.currentStock || 0,
        rate: s.rate || 0,
        amount: s.amount || 0,
        uomId: s.uomId?._id?.toString() || s.uomId?.toString() || "",
        uomName: s.uomId?.name || "",
        uomSymbol: s.uomId?.symbol || "",
        uomQuantity: s.uomQuantity || 1,
        perId: s.perId?._id?.toString() || s.perId?.toString() || "",
        perMultiplier: s.perId?.multiplier || 1,
      }));
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
