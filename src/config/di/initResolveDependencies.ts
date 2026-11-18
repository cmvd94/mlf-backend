import "reflect-metadata";
import { container } from "tsyringe";
import { CRUDAdminUserController } from "@/interfaces/controllers/admin/CRUDAdminUserController";
import { AdminAuthController } from "@/interfaces/controllers/admin/AdminAuthController";
import { AdminStaticDataController } from "@/interfaces/controllers/admin/AdminStaticDataController";
import { GodownController } from "@/interfaces/controllers/admin/GodownController";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { CreateUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/CreateUserUseCase";
import { initLoggerDI } from "./initRegisterLoggerDI";
import { initAdminDI } from "./initRegisterAdminDI";
import { initCommonDI } from "./initRegisterCommonDI";

initLoggerDI();
initAdminDI();
initCommonDI();

export const adminRepository = container.resolve(AdminRepository);
export const createAdminUserUseCase = container.resolve(CreateUserUseCase);
export const crudAdminController = container.resolve(CRUDAdminUserController);
export const adminAuthController = container.resolve(AdminAuthController);
export const adminStaticDataController = container.resolve(AdminStaticDataController);
export const godownController = container.resolve(GodownController);
