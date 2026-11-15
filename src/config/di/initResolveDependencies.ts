import "reflect-metadata";
import { container } from "tsyringe";
import { CRUDAdminUserController } from "@/interfaces/controllers/admin/CRUDAdminUserController";
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
