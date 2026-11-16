import { superAdminDetails } from "@/shared/constants/superAdmin";
import { AdminRepository } from "../repositories/admin/AdminRepository";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { Logger } from "winston";

export const ensureSuperAdmin = async (
  adminRepository: AdminRepository,
  logger: Logger
) => {
  try {
    const isAvailable = await adminRepository.findUserByRole(
      SuperAdmin.SUPER_ADMIN
    );
    if (!isAvailable) {
      const details = await superAdminDetails();
      await adminRepository.createAdminUser(details);
      logger.info("Super Admin (mlf_01) created successfully");
    } else {
      logger.info("Super Admin already exists");
    }
  } catch (error) {
    logger.error("Error ensuring Super Admin:", error);
  }
};
