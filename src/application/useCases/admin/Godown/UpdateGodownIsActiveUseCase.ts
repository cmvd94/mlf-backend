import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { generateObjectId, generateObjectIdsList } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { UpdateGodownIsActiveDTO } from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

@injectable()
export class UpdateGodownIsActiveUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(data: UpdateGodownIsActiveDTO, reqAdmin: ReqAdminDTO) {
    try {
      const ids = generateObjectIdsList(data.godownIds);
      const godowns = await this.godownRepository.findGodownByIds(ids);

      if (godowns.length !== data.godownIds.length) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.GODOWN_NOT_FOUND,
          ERROR_CODES.GODOWN_NOT_FOUND
        );
      }

      for (const godown of godowns) {
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
      }

      const reqAdminObjectId = generateObjectId(reqAdmin.userId);
      await this.godownRepository.updateGodownIsActive(
        data.godownIds,
        data.isActive,
        reqAdminObjectId
      );

      this.logger.info(
        `Godown status updated to ${data.isActive} for ${data.godownIds.length} godowns by: ${reqAdmin.userId}`
      );

      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.UpdateGodownIsActiveUseCase,
        this.logger
      );
    }
  }
}
