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
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { CreateGodownUseCase } from "@/application/useCases/admin/Godown/CreateGodownUseCase";
import { UpdateGodownUseCase } from "@/application/useCases/admin/Godown/UpdateGodownUseCase";
import { GetAGodownUseCase } from "@/application/useCases/admin/Godown/GetAGodownUseCase";
import { GetGodownListUseCase } from "@/application/useCases/admin/Godown/GetGodownListUseCase";
import { UpdateGodownIsActiveUseCase } from "@/application/useCases/admin/Godown/UpdateGodownIsActiveUseCase";
import { DeleteGodownUseCase } from "@/application/useCases/admin/Godown/DeleteGodownUseCase";
import { GetEligibleGodownAdminsUseCase } from "@/application/useCases/admin/Godown/GetEligibleGodownAdminsUseCase";
import { GodownController } from "@/interfaces/controllers/admin/GodownController";

export const initAdminDI = () => {
  container.registerSingleton(AdminRepository, AdminRepository);
  container.registerSingleton(AdminSessionRepository, AdminSessionRepository);
  container.registerSingleton(GodownRepository, GodownRepository);

  container.registerSingleton(CreateUserUseCase, CreateUserUseCase);
  container.registerSingleton(UpdateUserUseCase, UpdateUserUseCase);
  container.registerSingleton(DeleteUserUseCase, DeleteUserUseCase);
  container.registerSingleton(GetUserListUseCase, GetUserListUseCase);
  container.registerSingleton(GetAUserUseCase, GetAUserUseCase);
  container.registerSingleton(UpdateUserIsActiveUseCase, UpdateUserIsActiveUseCase);
  container.registerSingleton(AdminStaticDataUseCase, AdminStaticDataUseCase);
  container.registerSingleton(AdminLogoutUseCase, AdminLogoutUseCase);

  container.registerSingleton(CreateGodownUseCase, CreateGodownUseCase);
  container.registerSingleton(UpdateGodownUseCase, UpdateGodownUseCase);
  container.registerSingleton(GetAGodownUseCase, GetAGodownUseCase);
  container.registerSingleton(GetGodownListUseCase, GetGodownListUseCase);
  container.registerSingleton(UpdateGodownIsActiveUseCase, UpdateGodownIsActiveUseCase);
  container.registerSingleton(DeleteGodownUseCase, DeleteGodownUseCase);
  container.registerSingleton(GetEligibleGodownAdminsUseCase, GetEligibleGodownAdminsUseCase);

  container.registerSingleton(CRUDAdminUserController, CRUDAdminUserController);
  container.registerSingleton(AdminStaticDataController, AdminStaticDataController);
  container.registerSingleton(GodownController, GodownController);
};
