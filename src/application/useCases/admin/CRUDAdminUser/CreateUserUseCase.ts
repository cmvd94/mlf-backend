import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from "@/shared/constants/errorCodesMessages";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { isValidRole } from "@/shared/utils/adminRoleValidation";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { Logger } from "winston";
import { injectable, inject } from "tsyringe";
import { Types } from "mongoose";
import { CreateAdminUserDTO } from "@/shared/dto/admin/crudUserDTO";
import { checkRolePriority } from "@/shared/utils/adminRolePriorityComapre";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { validateAccessScope } from "@/shared/utils/accessScopeValidation";
import { compareLocationOfReqAdminNewUserWarehouse } from "@/shared/utils/validateLocationAdminNewUser";
import bcrypt from "bcryptjs";

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(AdminRepository) private adminRepository: AdminRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  execute = async (payload: CreateAdminUserDTO, reqAdmin: ReqAdminDTO) => {
    try {
      if (!checkRolePriority(reqAdmin.role, payload.role)) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.UNAUTHORIZED_ADMIN_ROLE,
          ERROR_CODES.UNAUTHORIZED_ADMIN_ROLE
        );
      }

      // Validate accessScope of new user
      if (!payload.accessScope) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.INVALID_ACCESS_SCOPE,
          ERROR_CODES.INVALID_ACCESS_SCOPE
        );
      }

      validateAccessScope(payload.role, payload.accessScope);

      // Compare accessScope of admin and new user to check if new user is in allowed location
      if (
        !compareLocationOfReqAdminNewUserWarehouse(
          reqAdmin.role,
          reqAdmin.accessScope,
          payload.accessScope
        )
      ) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.NEW_USER_ACCESS_SCOPE_NOT_MATCH,
          ERROR_CODES.NEW_USER_ACCESS_SCOPE_NOT_MATCH
        );
      }

      if (!isValidRole(payload.role)) {
        throw new HttpException(
          400,
          ERROR_MESSAGES.ADMIN_ROLE_INVALID,
          ERROR_CODES.ADMIN_ROLE_INVALID
        );
      }

      const creator = new Types.ObjectId(reqAdmin.userId);

      let hashedPassword: string | undefined = undefined;
      if (payload.password) {
        hashedPassword = await bcrypt.hash(payload.password, 10);
      }

      // Auto-generate sequential employee ID if not explicitly provided
      let employeeId = payload.employeeId?.trim();
      if (!employeeId) {
        const nextSeq = await this.counterRepository.getNextSequence(
          "ADMIN_EMPLOYEE_ID",
          this.logger
        );
        employeeId = `mlf_${nextSeq.toString().padStart(2, "0")}`;
      }

      const newUser = await this.adminRepository.createAdminUser({
        ...payload,
        employeeId,
        password: hashedPassword,
        createdBy: creator,
        updatedBy: creator,
      });

      this.logger.info(
        `Admin User created successfully: id:${newUser?._id} employeeId: ${employeeId} role: ${newUser?.role}, createdBy: ${reqAdmin.userId}`
      );
      return {
        id: newUser?._id,
        employeeId,
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.CreateAdminUserUseCase,
        this.logger
      );
    }
  };
}
