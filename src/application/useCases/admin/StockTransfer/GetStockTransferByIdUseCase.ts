import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetStockTransferByIdUseCase {
  constructor(
    @inject(StockTransferRepository) private stockTransferRepository: StockTransferRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const transfer: any = await this.stockTransferRepository.getStockTransferById(id);
      if (!transfer) {
        throw new HttpException(404, "Stock transfer not found", ERROR_CODES.NOT_FOUND);
      }

      // Verify access to at least one godown involved in the transfer
      let hasAccess = false;
      const allGodowns = [
        ...(transfer.sourceItems || []).flatMap((it: any) => [it.companyGodownId, it.godownId]),
        ...(transfer.destinationItems || []).flatMap((it: any) => [it.companyGodownId, it.godownId]),
      ].filter(Boolean);

      for (const g of allGodowns) {
        if (compareAdminAndGodownLocation(reqAdmin, g)) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess && allGodowns.length > 0) {
        throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
      }

      return transfer;
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
