import { AdminAccessScope } from "@/shared/constants/adminAccessScope";
import { AdminRole } from "@/shared/constants/adminRole";
import { Language } from "@/shared/constants/locale";
import { FINANCIAL_CONFIG } from "@/shared/constants/financialConfig";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class AdminStaticDataUseCase {
  constructor(@inject("AdminLogger") private logger: Logger) {}

  execute = async () => {
    try {
      const adminRoleValues = Object.values(AdminRole);
      const languageValues = Object.values(Language);

      this.logger.info("Admin Static Data fetched successfully");
      return {
        role: adminRoleValues,
        language: languageValues,
        adminAccessScope: AdminAccessScope,
        financialConfig: FINANCIAL_CONFIG,
      };
    } catch (error) {
      ErrorHandler.handleError(
        error,
        AdminErrorStage.AdminStaticDataUseCase,
        this.logger
      );
    }
  };
}
