import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetGodownStockUseCase {
  constructor(
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(godownId: string, reqAdmin: ReqAdminDTO) {
    try {
      const godown = await this.godownRepository.findGodownById(godownId);
      if (!godown || godown.isDeleted) {
        throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
      }

      const hasAccess = compareAdminAndGodownLocation(reqAdmin, godown);
      if (!hasAccess) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
          ERROR_CODES.GODOWN_ACCESS_DENIED
        );
      }

      const stocks = await this.godownStockRepository.getStocksByGodown(godownId);
      return { godown, stocks };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.GetAGodownUseCase, this.logger);
    }
  }
}
