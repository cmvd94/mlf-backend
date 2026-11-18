import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminRole, SuperAdmin } from "@/shared/constants/adminRole";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { GetEligibleGodownAdminsQueryDTO } from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

@injectable()
export class GetEligibleGodownAdminsUseCase {
  constructor(
    @inject(AdminRepository)
    private adminRepository: AdminRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(
    queryDto: GetEligibleGodownAdminsQueryDTO,
    reqAdmin: ReqAdminDTO
  ) {
    try {
      const query: any = {
        isDeleted: false,
        isActive: true,
      };

      // Role filter
      if (queryDto.role) {
        query.role = queryDto.role;
      } else {
        query.role = {
          $in: [
            AdminRole.GODOWN_MANAGER,
            AdminRole.SUPERVISOR,
            AdminRole.ASSISTANT,
            AdminRole.BILLING_USER,
          ],
        };
      }

      // Location match from query
      if (queryDto.country) query["accessScope.country"] = queryDto.country;
      if (queryDto.zone) query["accessScope.zone"] = queryDto.zone;
      if (queryDto.state) query["accessScope.state"] = queryDto.state;
      if (queryDto.district) query["accessScope.district"] = queryDto.district;

      // Requester admin jurisdiction filter if not Super Admin
      if (reqAdmin.role !== SuperAdmin.SUPER_ADMIN && reqAdmin.accessScope) {
        if (reqAdmin.accessScope.country) {
          query["accessScope.country"] = reqAdmin.accessScope.country;
        }
        if (reqAdmin.accessScope.zone) {
          query["accessScope.zone"] = reqAdmin.accessScope.zone;
        }
        if (reqAdmin.accessScope.state) {
          query["accessScope.state"] = reqAdmin.accessScope.state;
        }
        if (reqAdmin.accessScope.district) {
          query["accessScope.district"] = reqAdmin.accessScope.district;
        }
      }

      // Search filter
      if (queryDto.search && queryDto.search.trim().length > 0) {
        const regex = new RegExp(queryDto.search.trim(), "i");
        query.$or = [
          { name: regex },
          { employeeId: regex },
          { email: regex },
          { phoneNumber: regex },
        ];
      }

      const admins = await this.adminRepository.findEligibleAdminsForGodown(
        query,
        100
      );

      this.logger.info(
        `Eligible godown admins fetched: ${admins.length} candidates by: ${reqAdmin.userId}`
      );

      return {
        admins,
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.GetEligibleGodownAdminsUseCase,
        this.logger
      );
    }
  }
}
