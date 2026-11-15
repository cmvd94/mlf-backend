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
      await adminRepository.createAdminUser(superAdminDetails());
      logger.info("Super Admin is created successfully");
    } else {
      logger.info("Super Admin already exists");
    }
  } catch (error) {
    logger.error("Error ensuring Super Admin:", error);
  }
};
