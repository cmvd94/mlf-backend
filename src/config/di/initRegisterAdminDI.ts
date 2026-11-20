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
import { GetGodownStockUseCase } from "@/application/useCases/admin/Godown/GetGodownStockUseCase";
import { GodownController } from "@/interfaces/controllers/admin/GodownController";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { ItemGroupRepository } from "@/infrastructure/repositories/admin/ItemGroupRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import {
  CreatePartyUseCase,
  UpdatePartyUseCase,
  DeletePartyUseCase,
  GetPartyListUseCase,
} from "@/application/useCases/admin/Inventory/PartyUseCases";
import {
  CreatePurchaseTypeUseCase,
  UpdatePurchaseTypeUseCase,
  DeletePurchaseTypeUseCase,
  GetPurchaseTypeListUseCase,
} from "@/application/useCases/admin/Inventory/PurchaseTypeUseCases";
import {
  CreateUomUseCase,
  UpdateUomUseCase,
  DeleteUomUseCase,
  GetUomListUseCase,
} from "@/application/useCases/admin/Inventory/UomUseCases";
import {
  CreatePerUnitUseCase,
  UpdatePerUnitUseCase,
  DeletePerUnitUseCase,
  GetPerUnitListUseCase,
} from "@/application/useCases/admin/Inventory/PerUnitUseCases";
import {
  CreateItemGroupUseCase,
  UpdateItemGroupUseCase,
  DeleteItemGroupUseCase,
  GetItemGroupListUseCase,
} from "@/application/useCases/admin/Inventory/ItemGroupUseCases";
import {
  CreateItemUseCase,
  UpdateItemUseCase,
  DeleteItemUseCase,
  GetItemListUseCase,
} from "@/application/useCases/admin/Inventory/ItemUseCases";
import { GetMastersUseCase } from "@/application/useCases/admin/Inventory/GetMastersUseCase";
import { CreatePurchaseUseCase } from "@/application/useCases/admin/Purchase/CreatePurchaseUseCase";
import { UpdatePurchaseUseCase } from "@/application/useCases/admin/Purchase/UpdatePurchaseUseCase";
import { GetPurchaseListUseCase } from "@/application/useCases/admin/Purchase/GetPurchaseListUseCase";
import {
  GetPurchaseByIdUseCase,
  DeletePurchaseUseCase,
} from "@/application/useCases/admin/Purchase/PurchaseDetailsUseCases";
import { AccountInventoryController } from "@/interfaces/controllers/admin/AccountInventoryController";
import { PurchaseController } from "@/interfaces/controllers/admin/PurchaseController";

export const initAdminDI = () => {
  container.registerSingleton(AdminRepository, AdminRepository);
  container.registerSingleton(AdminSessionRepository, AdminSessionRepository);
  container.registerSingleton(GodownRepository, GodownRepository);
  container.registerSingleton(PartyRepository, PartyRepository);
  container.registerSingleton(PurchaseTypeRepository, PurchaseTypeRepository);
  container.registerSingleton(UomRepository, UomRepository);
  container.registerSingleton(PerUnitRepository, PerUnitRepository);
  container.registerSingleton(ItemGroupRepository, ItemGroupRepository);
  container.registerSingleton(ItemRepository, ItemRepository);
  container.registerSingleton(PurchaseRepository, PurchaseRepository);
  container.registerSingleton(GodownStockRepository, GodownStockRepository);

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
  container.registerSingleton(GetGodownStockUseCase, GetGodownStockUseCase);

  container.registerSingleton(GetMastersUseCase, GetMastersUseCase);
  container.registerSingleton(CreatePartyUseCase, CreatePartyUseCase);
  container.registerSingleton(UpdatePartyUseCase, UpdatePartyUseCase);
  container.registerSingleton(DeletePartyUseCase, DeletePartyUseCase);
  container.registerSingleton(GetPartyListUseCase, GetPartyListUseCase);

  container.registerSingleton(CreatePurchaseTypeUseCase, CreatePurchaseTypeUseCase);
  container.registerSingleton(UpdatePurchaseTypeUseCase, UpdatePurchaseTypeUseCase);
  container.registerSingleton(DeletePurchaseTypeUseCase, DeletePurchaseTypeUseCase);
  container.registerSingleton(GetPurchaseTypeListUseCase, GetPurchaseTypeListUseCase);

  container.registerSingleton(CreateUomUseCase, CreateUomUseCase);
  container.registerSingleton(UpdateUomUseCase, UpdateUomUseCase);
  container.registerSingleton(DeleteUomUseCase, DeleteUomUseCase);
  container.registerSingleton(GetUomListUseCase, GetUomListUseCase);

  container.registerSingleton(CreatePerUnitUseCase, CreatePerUnitUseCase);
  container.registerSingleton(UpdatePerUnitUseCase, UpdatePerUnitUseCase);
  container.registerSingleton(DeletePerUnitUseCase, DeletePerUnitUseCase);
  container.registerSingleton(GetPerUnitListUseCase, GetPerUnitListUseCase);

  container.registerSingleton(CreateItemGroupUseCase, CreateItemGroupUseCase);
  container.registerSingleton(UpdateItemGroupUseCase, UpdateItemGroupUseCase);
  container.registerSingleton(DeleteItemGroupUseCase, DeleteItemGroupUseCase);
  container.registerSingleton(GetItemGroupListUseCase, GetItemGroupListUseCase);

  container.registerSingleton(CreateItemUseCase, CreateItemUseCase);
  container.registerSingleton(UpdateItemUseCase, UpdateItemUseCase);
  container.registerSingleton(DeleteItemUseCase, DeleteItemUseCase);
  container.registerSingleton(GetItemListUseCase, GetItemListUseCase);

  container.registerSingleton(CreatePurchaseUseCase, CreatePurchaseUseCase);
  container.registerSingleton(UpdatePurchaseUseCase, UpdatePurchaseUseCase);
  container.registerSingleton(GetPurchaseListUseCase, GetPurchaseListUseCase);
  container.registerSingleton(GetPurchaseByIdUseCase, GetPurchaseByIdUseCase);
  container.registerSingleton(DeletePurchaseUseCase, DeletePurchaseUseCase);

  container.registerSingleton(CRUDAdminUserController, CRUDAdminUserController);
  container.registerSingleton(AdminStaticDataController, AdminStaticDataController);
  container.registerSingleton(GodownController, GodownController);
  container.registerSingleton(AccountInventoryController, AccountInventoryController);
  container.registerSingleton(PurchaseController, PurchaseController);
};
