import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { GodownType } from "@/domain/entities/admin/Godown";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";

@injectable()
export class GetAGodownUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const godown = await this.godownRepository.findGodownByIdPopulated(id);
      if (!godown) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.GODOWN_NOT_FOUND,
          ERROR_CODES.GODOWN_NOT_FOUND
        );
      }

      if (
        godown.type === GodownType.COMPANY_GODOWN &&
        reqAdmin.role !== SuperAdmin.SUPER_ADMIN
      ) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
        );
      }

      // Validate requester admin access scope
      if (
        !compareLocationOfReqAdminNewUserWarehouse(
          reqAdmin.role,
          reqAdmin.accessScope,
          {
            country: godown.country,
            zone: godown.zone,
            state: godown.state,
            district: godown.district,
          }
        )
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN,
          ERROR_CODES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN
        );
      }

      this.logger.info(`Godown fetched: ${id} by: ${reqAdmin.userId}`);
      return godown;
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetAGodownUseCase,
        this.logger
      );
    }
  }
}
