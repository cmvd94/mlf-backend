import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { generateObjectId, generateObjectIdsList } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { GodownType } from "@/domain/entities/admin/Godown";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession, Types } from "mongoose";

@injectable()
export class DeleteGodownUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject(AdminRepository)
    private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      const godown = await this.godownRepository.findGodownById(id);
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

      // Check admin regional access scope
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

      const godownDocObjectId = generateObjectId(id);
      const reqAdminObjectId = generateObjectId(reqAdmin.userId);

      // Collect all assigned admins to remove godownId and pincode
      const adminIdsToUpdate: Types.ObjectId[] = [];
      if (godown.godownManagerId) {
        adminIdsToUpdate.push(
          generateObjectId(godown.godownManagerId.toString())
        );
      }
      if (godown.supervisorId?.length) {
        adminIdsToUpdate.push(
          ...generateObjectIdsList(
            godown.supervisorId.map((s: any) => s.toString())
          )
        );
      }
      if (godown.assistantId?.length) {
        adminIdsToUpdate.push(
          ...generateObjectIdsList(
            godown.assistantId.map((a: any) => a.toString())
          )
        );
      }
      if (godown.billingUserId) {
        adminIdsToUpdate.push(
          generateObjectId(godown.billingUserId.toString())
        );
      }

      await withTransaction(async (session: ClientSession) => {
        if (adminIdsToUpdate.length > 0) {
          await this.adminRepository.updateAdminForGodown(
            adminIdsToUpdate,
            {
              $pull: {
                godownId: godownDocObjectId,
                "accessScope.pincode": godown.pincode,
              },
              $set: {
                updatedBy: reqAdminObjectId,
                updatedAt: new Date(),
              },
            },
            session
          );
        }

        await this.godownRepository.softDeleteGodowns(
          [godownDocObjectId],
          reqAdminObjectId,
          session
        );
      });

      this.logger.info(`Godown ${id} soft-deleted by: ${reqAdmin.userId}`);
      return {};
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.DeleteGodownUseCase,
        this.logger
      );
    }
  }
}
