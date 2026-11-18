import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { isValidAccessScope } from "@/shared/utils/accessScopeValidation";
import { generateGodownQuery } from "@/shared/utils/godownQueryHelper";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { GetGodownListQueryDTO } from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

@injectable()
export class GetGodownListUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetGodownListQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      // Validate location filter if provided
      if (dto.country || dto.zone || dto.state || dto.district) {
        if (!isValidAccessScope(dto.country, dto.zone, dto.state, dto.district)) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.GODOWN_INVALID_LOCATION,
            ERROR_CODES.GODOWN_INVALID_LOCATION
          );
        }
      }

      const { query, hasAccess } = generateGodownQuery(dto, reqAdmin);

      if (!hasAccess) {
        return {
          godowns: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: dto.limit || 10,
          },
        };
      }

      const page = dto.page || 1;
      const limit = dto.limit || 10;

      const totalCount = await this.godownRepository.countGodowns(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);

      const godowns = await this.godownRepository.getGodownList(
        query,
        validPage,
        limit
      );

      this.logger.info(
        `Godown list fetched: ${godowns.length} items (page ${validPage}/${totalPages}) by: ${reqAdmin.userId}`
      );

      return {
        godowns,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetGodownListUseCase,
        this.logger
      );
    }
  }
}
