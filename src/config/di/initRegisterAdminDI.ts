import { container } from "tsyringe";
import { AdminRepository } from "@/infrastructure/repositories/admin/AdminRepository";
import { AdminSessionRepository } from "@/infrastructure/repositories/admin/AdminSessionRepository";
import { CreateUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/CreateUserUseCase";
import { UpdateUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/DeleteUserUseCase";
import { GetUserListUseCase } from "@/application/useCases/admin/CRUDAdminUser/GetUserListUseCase";
import { GetAUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/GetAUserUseCase";
import { UpdateUserIsActiveUseCase } from "@/application/useCases/admin/CRUDAdminUser/UpdateUserIsActiveUseCase";
import { AdminStaticDataUseCase } from "@/application/useCases/admin/AdminStaticDataUseCase";
import { AdminLogoutUseCase } from "@/application/useCases/admin/AuthAdmin/AdminLogoutUseCase";
import { CRUDAdminUserController } from "@/interfaces/controllers/admin/CRUDAdminUserController";
import { AdminStaticDataController } from "@/interfaces/controllers/admin/AdminStaticDataController";

export const initAdminDI = () => {
  container.registerSingleton(AdminRepository, AdminRepository);
  container.registerSingleton(AdminSessionRepository, AdminSessionRepository);

  container.registerSingleton(CreateUserUseCase, CreateUserUseCase);
  container.registerSingleton(UpdateUserUseCase, UpdateUserUseCase);
  container.registerSingleton(DeleteUserUseCase, DeleteUserUseCase);
  container.registerSingleton(GetUserListUseCase, GetUserListUseCase);
  container.registerSingleton(GetAUserUseCase, GetAUserUseCase);
  container.registerSingleton(UpdateUserIsActiveUseCase, UpdateUserIsActiveUseCase);
  container.registerSingleton(AdminStaticDataUseCase, AdminStaticDataUseCase);
  container.registerSingleton(AdminLogoutUseCase, AdminLogoutUseCase);

  container.registerSingleton(CRUDAdminUserController, CRUDAdminUserController);
  container.registerSingleton(AdminStaticDataController, AdminStaticDataController);
};
