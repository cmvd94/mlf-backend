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
import { UpdateGodownDTO } from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId, generateObjectIdsList } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import { AdminRole } from "@/shared/constants/adminRole";
import { GodownType } from "@/domain/entities/admin/Godown";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession, Types } from "mongoose";

@injectable()
export class UpdateGodownUseCase {
  constructor(
    @inject(GodownRepository)
    private godownRepository: GodownRepository,
    @inject(AdminRepository)
    private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, data: UpdateGodownDTO, reqAdmin: ReqAdminDTO) {
    try {
      const existing = await this.godownRepository.findGodownById(id);
      if (!existing) {
        throw new HttpException(
          404,
          ERROR_MESSAGES.GODOWN_NOT_FOUND,
          ERROR_CODES.GODOWN_NOT_FOUND
        );
      }

      // Check if admin has access scope over this godown's location
      const godownLocation = {
        country: existing.country,
        zone: existing.zone,
        state: existing.state,
        district: existing.district,
      };

      if (
        !compareLocationOfReqAdminNewUserWarehouse(
          reqAdmin.role,
          reqAdmin.accessScope,
          godownLocation
        )
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN,
          ERROR_CODES.GODOWN_ACCESS_SCOPE_NOT_MATCH_WITH_ADMIN
        );
      }

      const godownDocId = generateObjectId(id);
      const idsToAdd: Types.ObjectId[] = [];
      const idsToRemove: Types.ObjectId[] = [];

      const updatePayload: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };

      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.godownId !== undefined) updatePayload.godownId = data.godownId;
      if (data.type !== undefined) updatePayload.type = data.type;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.address !== undefined) updatePayload.address = data.address.trim();
      if (data.gstin !== undefined) updatePayload.gstin = data.gstin.trim();
      if (data.phoneNumber !== undefined) updatePayload.phoneNumber = data.phoneNumber.trim();
      if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

      const effectiveType = data.type ?? existing.type;
      if (effectiveType === GodownType.JOBWORK_GODOWN) {
        // Jobwork godowns do not require admin user assigning (all four fields)
        const hasManager = Boolean(data.godownManagerId && data.godownManagerId.trim().length > 0);
        const hasSupervisors = Boolean(
          (data.supervisorId && data.supervisorId.length > 0) ||
          (data.newSupervisorIds && data.newSupervisorIds.length > 0)
        );
        const hasAssistants = Boolean(
          (data.assistantId && data.assistantId.length > 0) ||
          (data.newAssistantIds && data.newAssistantIds.length > 0)
        );
        const hasBillingUser = Boolean(data.billingUserId && data.billingUserId.trim().length > 0);

        if (hasManager || hasSupervisors || hasAssistants || hasBillingUser) {
          throw new HttpException(
            400,
            ERROR_MESSAGES.JOBWORK_GODOWN_ADMIN_NOT_ALLOWED,
            ERROR_CODES.JOBWORK_GODOWN_ADMIN_NOT_ALLOWED
          );
        }

        // Remove any previously assigned users if transitioning from company godown
        if (existing.godownManagerId) {
          idsToRemove.push(
            generateObjectId(existing.godownManagerId.toString())
          );
        }
        if (existing.supervisorId?.length) {
          idsToRemove.push(
            ...generateObjectIdsList(
              existing.supervisorId.map((s: any) => s.toString())
            )
          );
        }
        if (existing.assistantId?.length) {
          idsToRemove.push(
            ...generateObjectIdsList(
              existing.assistantId.map((a: any) => a.toString())
            )
          );
        }
        if (existing.billingUserId) {
          idsToRemove.push(
            generateObjectId(existing.billingUserId.toString())
          );
        }

        updatePayload.godownManagerId = null;
        updatePayload.supervisorId = [];
        updatePayload.assistantId = [];
        updatePayload.billingUserId = null;
      } else {
        // 1. Handle Godown Manager update
        if (data.godownManagerId !== undefined) {
          if (data.godownManagerId === null || data.godownManagerId === "") {
            if (existing.godownManagerId) {
              idsToRemove.push(
                generateObjectId(existing.godownManagerId.toString())
              );
            }
            updatePayload.godownManagerId = null;
          } else {
            const newManagerId = generateObjectId(data.godownManagerId);
            const currentManagerIdStr = existing.godownManagerId?.toString();

            if (currentManagerIdStr !== data.godownManagerId) {
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

              if (existing.godownManagerId) {
                idsToRemove.push(
                  generateObjectId(existing.godownManagerId.toString())
                );
              }
              idsToAdd.push(newManagerId);
              updatePayload.godownManagerId = newManagerId;
            }
          }
        }

        // 2. Handle Supervisors update
        let currentSupervisors = (existing.supervisorId || []).map((s: any) =>
          s.toString()
        );

        if (data.supervisorId !== undefined) {
          const newSupIds = data.supervisorId || [];
          const toAdd = newSupIds.filter(
            (id) => !currentSupervisors.includes(id)
          );
          const toRemove = currentSupervisors.filter(
            (id) => !newSupIds.includes(id)
          );

          if (toAdd.length > 0) {
            const supUsers = await this.adminRepository.findUsersByIds(
              generateObjectIdsList(toAdd)
            );
            if (supUsers.length !== toAdd.length) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_SUPERVISOR_NOT_FOUND,
                ERROR_CODES.GODOWN_SUPERVISOR_NOT_FOUND
              );
            }
            for (const s of supUsers) {
              if (!s.isActive) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_SUPERVISOR_DISABLED,
                  ERROR_CODES.GODOWN_SUPERVISOR_DISABLED
                );
              }
              if (s.role !== AdminRole.SUPERVISOR) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_SUPERVISOR_ROLE_INVALID,
                  ERROR_CODES.GODOWN_SUPERVISOR_ROLE_INVALID
                );
              }
              if (
                !compareLocationOfReqAdminNewUserWarehouse(
                  s.role,
                  s.accessScope,
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
            idsToAdd.push(...generateObjectIdsList(toAdd));
          }

          if (toRemove.length > 0) {
            idsToRemove.push(...generateObjectIdsList(toRemove));
          }

          updatePayload.supervisorId = generateObjectIdsList(newSupIds);
        } else {
          if (data.newSupervisorIds?.length) {
            const toAdd = data.newSupervisorIds.filter(
              (id) => !currentSupervisors.includes(id)
            );
            if (toAdd.length > 0) {
              const supUsers = await this.adminRepository.findUsersByIds(
                generateObjectIdsList(toAdd)
              );
              if (supUsers.length !== toAdd.length) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_SUPERVISOR_NOT_FOUND,
                  ERROR_CODES.GODOWN_SUPERVISOR_NOT_FOUND
                );
              }
              for (const s of supUsers) {
                if (!s.isActive) {
                  throw new HttpException(
                    400,
                    ERROR_MESSAGES.GODOWN_SUPERVISOR_DISABLED,
                    ERROR_CODES.GODOWN_SUPERVISOR_DISABLED
                  );
                }
                if (s.role !== AdminRole.SUPERVISOR) {
                  throw new HttpException(
                    400,
                    ERROR_MESSAGES.GODOWN_SUPERVISOR_ROLE_INVALID,
                    ERROR_CODES.GODOWN_SUPERVISOR_ROLE_INVALID
                  );
                }
                if (
                  !compareLocationOfReqAdminNewUserWarehouse(
                    s.role,
                    s.accessScope,
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
              idsToAdd.push(...generateObjectIdsList(toAdd));
              currentSupervisors = [...currentSupervisors, ...toAdd];
            }
          }
          if (data.removeSupervisorIds?.length) {
            const toRemove = data.removeSupervisorIds.filter((id) =>
              currentSupervisors.includes(id)
            );
            if (toRemove.length > 0) {
              idsToRemove.push(...generateObjectIdsList(toRemove));
              currentSupervisors = currentSupervisors.filter(
                (id) => !toRemove.includes(id)
              );
            }
          }
          if (data.newSupervisorIds || data.removeSupervisorIds) {
            updatePayload.supervisorId = generateObjectIdsList(
              currentSupervisors
            );
          }
        }

        // 3. Handle Assistants update
        let currentAssistants = (existing.assistantId || []).map((a: any) =>
          a.toString()
        );

        if (data.assistantId !== undefined) {
          const newAsstIds = data.assistantId || [];
          const toAdd = newAsstIds.filter(
            (id) => !currentAssistants.includes(id)
          );
          const toRemove = currentAssistants.filter(
            (id) => !newAsstIds.includes(id)
          );

          if (toAdd.length > 0) {
            const asstUsers = await this.adminRepository.findUsersByIds(
              generateObjectIdsList(toAdd)
            );
            if (asstUsers.length !== toAdd.length) {
              throw new HttpException(
                400,
                ERROR_MESSAGES.GODOWN_ASSISTANT_NOT_FOUND,
                ERROR_CODES.GODOWN_ASSISTANT_NOT_FOUND
              );
            }
            for (const a of asstUsers) {
              if (!a.isActive) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_ASSISTANT_DISABLED,
                  ERROR_CODES.GODOWN_ASSISTANT_DISABLED
                );
              }
              if (a.role !== AdminRole.ASSISTANT) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_ASSISTANT_ROLE_INVALID,
                  ERROR_CODES.GODOWN_ASSISTANT_ROLE_INVALID
                );
              }
              if (
                !compareLocationOfReqAdminNewUserWarehouse(
                  a.role,
                  a.accessScope,
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
            idsToAdd.push(...generateObjectIdsList(toAdd));
          }

          if (toRemove.length > 0) {
            idsToRemove.push(...generateObjectIdsList(toRemove));
          }

          updatePayload.assistantId = generateObjectIdsList(newAsstIds);
        } else {
          if (data.newAssistantIds?.length) {
            const toAdd = data.newAssistantIds.filter(
              (id) => !currentAssistants.includes(id)
            );
            if (toAdd.length > 0) {
              const asstUsers = await this.adminRepository.findUsersByIds(
                generateObjectIdsList(toAdd)
              );
              if (asstUsers.length !== toAdd.length) {
                throw new HttpException(
                  400,
                  ERROR_MESSAGES.GODOWN_ASSISTANT_NOT_FOUND,
                  ERROR_CODES.GODOWN_ASSISTANT_NOT_FOUND
                );
              }
              for (const a of asstUsers) {
                if (!a.isActive) {
                  throw new HttpException(
                    400,
                    ERROR_MESSAGES.GODOWN_ASSISTANT_DISABLED,
                    ERROR_CODES.GODOWN_ASSISTANT_DISABLED
                  );
                }
                if (a.role !== AdminRole.ASSISTANT) {
                  throw new HttpException(
                    400,
                    ERROR_MESSAGES.GODOWN_ASSISTANT_ROLE_INVALID,
                    ERROR_CODES.GODOWN_ASSISTANT_ROLE_INVALID
                  );
                }
                if (
                  !compareLocationOfReqAdminNewUserWarehouse(
                    a.role,
                    a.accessScope,
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
              idsToAdd.push(...generateObjectIdsList(toAdd));
              currentAssistants = [...currentAssistants, ...toAdd];
            }
          }
          if (data.removeAssistantIds?.length) {
            const toRemove = data.removeAssistantIds.filter((id) =>
              currentAssistants.includes(id)
            );
            if (toRemove.length > 0) {
              idsToRemove.push(...generateObjectIdsList(toRemove));
              currentAssistants = currentAssistants.filter(
                (id) => !toRemove.includes(id)
              );
            }
          }
          if (data.newAssistantIds || data.removeAssistantIds) {
            updatePayload.assistantId = generateObjectIdsList(
              currentAssistants
            );
          }
        }

        // 4. Handle Billing User update
        if (data.billingUserId !== undefined) {
          if (data.billingUserId === null || data.billingUserId === "") {
            if (existing.billingUserId) {
              idsToRemove.push(
                generateObjectId(existing.billingUserId.toString())
              );
            }
            updatePayload.billingUserId = null;
          } else {
            const newBillingId = generateObjectId(data.billingUserId);
            const currentBillingIdStr = existing.billingUserId?.toString();

            if (currentBillingIdStr !== data.billingUserId) {
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

              if (existing.billingUserId) {
                idsToRemove.push(
                  generateObjectId(existing.billingUserId.toString())
                );
              }
              idsToAdd.push(newBillingId);
              updatePayload.billingUserId = newBillingId;
            }
          }
        }
      }

      let updatedGodown;

      await withTransaction(async (session: ClientSession) => {
        // Remove unassigned admins from godown
        if (idsToRemove.length > 0) {
          await this.adminRepository.updateAdminForGodown(
            idsToRemove,
            {
              $pull: {
                godownId: godownDocId,
                "accessScope.pincode": existing.pincode,
              },
              $set: {
                updatedBy: generateObjectId(reqAdmin.userId),
                updatedAt: new Date(),
              },
            },
            session
          );
        }

        // Add newly assigned admins to godown
        if (idsToAdd.length > 0) {
          await this.adminRepository.updateAdminForGodown(
            idsToAdd,
            {
              $addToSet: {
                godownId: godownDocId,
                "accessScope.pincode": existing.pincode,
              },
              $set: {
                updatedBy: generateObjectId(reqAdmin.userId),
                updatedAt: new Date(),
              },
            },
            session
          );
        }

        updatedGodown = await this.godownRepository.updateGodown(
          id,
          updatePayload,
          session
        );
      });

      this.logger.info(`Godown ${id} updated successfully by: ${reqAdmin.userId}`);
      return updatedGodown;
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.UpdateGodownUseCase,
        this.logger
      );
    }
  }
}
