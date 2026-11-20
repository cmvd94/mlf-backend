import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GetStockTransferListQueryDTO } from "@/shared/dto/admin/stockTransferDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetStockTransferListUseCase {
  constructor(
    @inject(StockTransferRepository) private stockTransferRepository: StockTransferRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetStockTransferListQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Regional access scope check
      const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
      if (!hasAccess) {
        throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
      }

      const accessibleGodowns = await this.godownRepository.getAllGodownsByQuery(godownQuery);
      const accessibleGodownIds = accessibleGodowns.map((g) => g._id.toString());

      if (accessibleGodownIds.length === 0) {
        return {
          transfers: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: dto.page || 1,
        };
      }

      const filterQuery: any = {
        isDeleted: false,
      };

      // Godown filter
      if (dto.godownId && dto.godownId.trim().length > 0) {
        const targetGodown = await this.godownRepository.findGodownById(dto.godownId.trim());
        if (!targetGodown || targetGodown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }
        const canAccess = compareAdminAndGodownLocation(reqAdmin, targetGodown);
        if (!canAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        const godownObjectId = generateObjectId(dto.godownId.trim());
        filterQuery.$or = [
          { "sourceItems.godownId": godownObjectId },
          { "destinationItems.godownId": godownObjectId },
        ];
      } else {
        // Must involve at least one accessible godown
        const accessibleObjectIds = accessibleGodownIds.map((id) => generateObjectId(id));
        filterQuery.$or = [
          { "sourceItems.godownId": { $in: accessibleObjectIds } },
          { "destinationItems.godownId": { $in: accessibleObjectIds } },
        ];
      }

      // Date range filter
      if (dto.fromDate || dto.toDate) {
        filterQuery.date = {};
        if (dto.fromDate) {
          const from = new Date(dto.fromDate);
          from.setHours(0, 0, 0, 0);
          filterQuery.date.$gte = from;
        }
        if (dto.toDate) {
          const to = new Date(dto.toDate);
          to.setHours(23, 59, 59, 999);
          filterQuery.date.$lte = to;
        }
      }

      // Search filter (by transferNumber or narration or batchNo)
      if (dto.search && dto.search.trim().length > 0) {
        const regex = new RegExp(dto.search.trim(), "i");
        filterQuery.$and = filterQuery.$and || [];
        filterQuery.$and.push({
          $or: [
            { transferNumber: regex },
            { narration: regex },
            { "sourceItems.batchNo": regex },
            { "destinationItems.batchNo": regex },
          ],
        });
      }

      const page = Number(dto.page) || 1;
      const limit = Number(dto.limit) || 20;

      return await this.stockTransferRepository.getStockTransferList(filterQuery, page, limit);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
