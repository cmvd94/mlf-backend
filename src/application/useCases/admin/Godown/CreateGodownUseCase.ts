import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { generateObjectId, generateObjectIdsList } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import HttpException from "@/shared/exceptions/HttpException";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { CreateGodownDTO } from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { isValidAccessScope } from "@/shared/utils/accessScopeValidation";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import { AdminRole } from "@/shared/constants/adminRole";
import { GodownType } from "@/domain/entities/admin/Godown";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession, Types } from "mongoose";

@injectable()
export class CreateGodownUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject(AdminRepository)
    private adminRepository: AdminRepository,
    @inject(CounterRepository)
    private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(data: CreateGodownDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Validate Godown location hierarchy
      if (
        !data.country ||
        !data.zone ||
        !data.state ||
        !data.district ||
        !data.pincode
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_INVALID_LOCATION,
          ERROR_CODES.GODOWN_INVALID_LOCATION
        );
      }

      if (
        !isValidAccessScope(data.country, data.zone, data.state, data.district)
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_INVALID_LOCATION,
          ERROR_CODES.GODOWN_INVALID_LOCATION
        );
      }

      // 2. Validate requester admin's access scope covers godown location
      if (
        !compareLocationOfReqAdminNewUserWarehouse(
          reqAdmin.role,
          reqAdmin.accessScope,
          {
            country: data.country,
            zone: data.zone,
            state: data.state,
            district: data.district,
          }
        )
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN,
          ERROR_CODES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN
        );
      }

      const godownLocation = {
        country: data.country,
        zone: data.zone,
        state: data.state,
        district: data.district,
      };

      if (data.type === GodownType.JOBWORK_GODOWN) {
        // Jobwork godowns do not require admin user assigning (all four fields)
        const hasManager = Boolean(data.godownManagerId && data.godownManagerId.trim().length > 0);
        const hasSupervisors = Boolean(data.supervisorId && data.supervisorId.length > 0);
        const hasAssistants = Boolean(data.assistantId && data.assistantId.length > 0);
        const hasBillingUser = Boolean(data.billingUserId && data.billingUserId.trim().length > 0);

        if (hasManager || hasSupervisors || hasAssistants || hasBillingUser) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.JOBWORK_GODOWN_ADMIN_NOT_ALLOWED,
            ERROR_CODES.JOBWORK_GODOWN_ADMIN_NOT_ALLOWED
          );
        }

        data.godownManagerId = undefined;
        data.supervisorId = [];
        data.assistantId = [];
        data.billingUserId = undefined;
      } else {
        // 3. Validate Godown Manager (Single user - optional for company godown)
        if (data.godownManagerId) {
          const manager = await this.adminRepository.findUserById(
            data.godownManagerId
          );
          if (!manager) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_MANAGER_NOT_FOUND,
              ERROR_CODES.GODOWN_MANAGER_NOT_FOUND
            );
          }
          if (!manager.isActive) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_MANAGER_DISABLED,
              ERROR_CODES.GODOWN_MANAGER_DISABLED
            );
          }
          if (manager.role !== AdminRole.GODOWN_MANAGER) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_MANAGER_ROLE_INVALID,
              ERROR_CODES.GODOWN_MANAGER_ROLE_INVALID
            );
          }
          if (
            !compareLocationOfReqAdminNewUserWarehouse(
              manager.role,
              manager.accessScope,
              godownLocation
            )
          ) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_MANAGER_ACCESS_SCOPE_NOT_MATCH,
              ERROR_CODES.GODOWN_MANAGER_ACCESS_SCOPE_NOT_MATCH
            );
          }
        }

        // 4. Validate Supervisors (Array of users - optional for company godown)
        if (data.supervisorId?.length) {
          const supObjectIds = generateObjectIdsList(data.supervisorId);
          const supervisors = await this.adminRepository.findUsersByIds(
            supObjectIds
          );
          if (supervisors.length !== data.supervisorId.length) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_SUPERVISOR_NOT_FOUND,
              ERROR_CODES.GODOWN_SUPERVISOR_NOT_FOUND
            );
          }
          for (const sup of supervisors) {
            if (!sup.isActive) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_SUPERVISOR_DISABLED,
                ERROR_CODES.GODOWN_SUPERVISOR_DISABLED
              );
            }
            if (sup.role !== AdminRole.SUPERVISOR) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_SUPERVISOR_ROLE_INVALID,
                ERROR_CODES.GODOWN_SUPERVISOR_ROLE_INVALID
              );
            }
            if (
              !compareLocationOfReqAdminNewUserWarehouse(
                sup.role,
                sup.accessScope,
                godownLocation
              )
            ) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_SUPERVISOR_ACCESS_SCOPE_NOT_MATCH,
                ERROR_CODES.GODOWN_SUPERVISOR_ACCESS_SCOPE_NOT_MATCH
              );
            }
          }
        }

        // 5. Validate Assistants (Array of users - optional for company godown)
        if (data.assistantId?.length) {
          const asstObjectIds = generateObjectIdsList(data.assistantId);
          const assistants = await this.adminRepository.findUsersByIds(
            asstObjectIds
          );
          if (assistants.length !== data.assistantId.length) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_ASSISTANT_NOT_FOUND,
              ERROR_CODES.GODOWN_ASSISTANT_NOT_FOUND
            );
          }
          for (const asst of assistants) {
            if (!asst.isActive) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_ASSISTANT_DISABLED,
                ERROR_CODES.GODOWN_ASSISTANT_DISABLED
              );
            }
            if (asst.role !== AdminRole.ASSISTANT) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_ASSISTANT_ROLE_INVALID,
                ERROR_CODES.GODOWN_ASSISTANT_ROLE_INVALID
              );
            }
            if (
              !compareLocationOfReqAdminNewUserWarehouse(
                asst.role,
                asst.accessScope,
                godownLocation
              )
            ) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_ASSISTANT_ACCESS_SCOPE_NOT_MATCH,
                ERROR_CODES.GODOWN_ASSISTANT_ACCESS_SCOPE_NOT_MATCH
              );
            }
          }
        }

        // 6. Validate Billing User (Single user - optional for company godown)
        if (data.billingUserId) {
          const billingUser = await this.adminRepository.findUserById(
            data.billingUserId
          );
          if (!billingUser) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_BILLING_USER_NOT_FOUND,
              ERROR_CODES.GODOWN_BILLING_USER_NOT_FOUND
            );
          }
          if (!billingUser.isActive) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_BILLING_USER_DISABLED,
              ERROR_CODES.GODOWN_BILLING_USER_DISABLED
            );
          }
          if (billingUser.role !== AdminRole.BILLING_USER) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_BILLING_USER_ROLE_INVALID,
              ERROR_CODES.GODOWN_BILLING_USER_ROLE_INVALID
            );
          }
          if (
            !compareLocationOfReqAdminNewUserWarehouse(
              billingUser.role,
              billingUser.accessScope,
              godownLocation
            )
          ) {
            throw new HttpException(
              400,
              ERROR_MESSAGES.GODOWN_BILLING_USER_ACCESS_SCOPE_NOT_MATCH,
              ERROR_CODES.GODOWN_BILLING_USER_ACCESS_SCOPE_NOT_MATCH
            );
          }
        }
      }

      // Auto-generate Godown ID if not provided
      let finalGodownId = data.godownId;
      if (!finalGodownId) {
        const seq = await this.counterRepository.getNextSequence(
          "GODOWN_ID",
          this.logger
        );
        finalGodownId = `GD_${seq.toString().padStart(2, "0")}`;
      }

      let newGodownId: Types.ObjectId | undefined;

      await withTransaction(async (session: ClientSession) => {
        const godownPayload = {
          godownId: finalGodownId,
          name: data.name,
          type: data.type,
          description: data.description || "",
          country: data.country,
          zone: data.zone,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          godownManagerId: data.godownManagerId
            ? generateObjectId(data.godownManagerId)
            : undefined,
          supervisorId: data.supervisorId
            ? generateObjectIdsList(data.supervisorId)
            : [],
          assistantId: data.assistantId
            ? generateObjectIdsList(data.assistantId)
            : [],
          billingUserId: data.billingUserId
            ? generateObjectId(data.billingUserId)
            : undefined,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: generateObjectId(reqAdmin.userId),
        };

        newGodownId = await this.godownRepository.createGodown(
          godownPayload,
          session
        );

        // Update assigned users to add godownId and pincode to their access scope
        const assignedUserIds: Types.ObjectId[] = [];
        if (data.godownManagerId) {
          assignedUserIds.push(generateObjectId(data.godownManagerId));
        }
        if (data.supervisorId?.length) {
          assignedUserIds.push(...generateObjectIdsList(data.supervisorId));
        }
        if (data.assistantId?.length) {
          assignedUserIds.push(...generateObjectIdsList(data.assistantId));
        }
        if (data.billingUserId) {
          assignedUserIds.push(generateObjectId(data.billingUserId));
        }

        if (assignedUserIds.length > 0) {
          await this.adminRepository.updateAdminForGodown(
            assignedUserIds,
            {
              $addToSet: {
                godownId: newGodownId,
                "accessScope.pincode": data.pincode,
              },
              $set: {
                updatedBy: generateObjectId(reqAdmin.userId),
                updatedAt: new Date(),
              },
            },
            session
          );
        }
      });

      this.logger.info(
        `Godown ${finalGodownId} created successfully with regional scope [${data.country}/${data.zone}/${data.state}/${data.district}] by: ${reqAdmin.userId}`
      );
      return newGodownId;
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.CreateGodownUseCase,
        this.logger
      );
    }
  }
}
