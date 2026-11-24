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
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { ItemGroupRepository } from "@/infrastructure/repositories/admin/ItemGroupRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { HsnCodeRepository } from "@/infrastructure/repositories/admin/HsnCodeRepository";
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
  CreateSalesTypeUseCase,
  UpdateSalesTypeUseCase,
  DeleteSalesTypeUseCase,
  GetSalesTypeListUseCase,
} from "@/application/useCases/admin/Inventory/SalesTypeUseCases";
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
import {
  CreateHsnCodeUseCase,
  UpdateHsnCodeUseCase,
  DeleteHsnCodeUseCase,
  GetHsnCodeListUseCase,
} from "@/application/useCases/admin/Inventory/HsnCodeUseCases";
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
import { StockSummaryRepository } from "@/infrastructure/repositories/admin/StockSummaryRepository";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { GetStockSummaryUseCase } from "@/application/useCases/admin/Inventory/GetStockSummaryUseCase";
import { StockSummaryController } from "@/interfaces/controllers/admin/StockSummaryController";
import { CreateStockTransferUseCase } from "@/application/useCases/admin/StockTransfer/CreateStockTransferUseCase";
import { GetStockTransferListUseCase } from "@/application/useCases/admin/StockTransfer/GetStockTransferListUseCase";
import { GetStockTransferByIdUseCase } from "@/application/useCases/admin/StockTransfer/GetStockTransferByIdUseCase";
import { GetAvailableStockForTransferUseCase } from "@/application/useCases/admin/StockTransfer/GetAvailableStockForTransferUseCase";
import { StockTransferController } from "@/interfaces/controllers/admin/StockTransferController";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { CreateSaleUseCase } from "@/application/useCases/admin/Sale/CreateSaleUseCase";
import { UpdateSaleUseCase } from "@/application/useCases/admin/Sale/UpdateSaleUseCase";
import { GetSaleListUseCase } from "@/application/useCases/admin/Sale/GetSaleListUseCase";
import {
  GetSaleByIdUseCase,
  DeleteSaleUseCase,
} from "@/application/useCases/admin/Sale/SaleDetailsUseCases";
import { GetAvailableStockForSaleUseCase } from "@/application/useCases/admin/Sale/GetAvailableStockForSaleUseCase";
import { SaleController } from "@/interfaces/controllers/admin/SaleController";
import { DebitNoteRepository } from "@/infrastructure/repositories/admin/DebitNoteRepository";
import { CreateDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/CreateDebitNoteUseCase";
import { UpdateDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/UpdateDebitNoteUseCase";
import { GetDebitNoteListUseCase } from "@/application/useCases/admin/DebitNote/GetDebitNoteListUseCase";
import {
  GetDebitNoteByIdUseCase,
  DeleteDebitNoteUseCase,
} from "@/application/useCases/admin/DebitNote/DebitNoteDetailsUseCases";
import { GetAvailableStockForDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/GetAvailableStockForDebitNoteUseCase";
import { DebitNoteController } from "@/interfaces/controllers/admin/DebitNoteController";
import { CreditNoteRepository } from "@/infrastructure/repositories/admin/CreditNoteRepository";
import { CreateCreditNoteUseCase } from "@/application/useCases/admin/CreditNote/CreateCreditNoteUseCase";
import { UpdateCreditNoteUseCase } from "@/application/useCases/admin/CreditNote/UpdateCreditNoteUseCase";
import { GetCreditNoteListUseCase } from "@/application/useCases/admin/CreditNote/GetCreditNoteListUseCase";
import {
  GetCreditNoteByIdUseCase,
  DeleteCreditNoteUseCase,
} from "@/application/useCases/admin/CreditNote/CreditNoteDetailsUseCases";
import { CreditNoteController } from "@/interfaces/controllers/admin/CreditNoteController";

export const initAdminDI = () => {
  container.registerSingleton(AdminRepository, AdminRepository);
  container.registerSingleton(AdminSessionRepository, AdminSessionRepository);
  container.registerSingleton(GodownRepository, GodownRepository);
  container.registerSingleton(PartyRepository, PartyRepository);
  container.registerSingleton(PurchaseTypeRepository, PurchaseTypeRepository);
  container.registerSingleton(SalesTypeRepository, SalesTypeRepository);
  container.registerSingleton(UomRepository, UomRepository);
  container.registerSingleton(PerUnitRepository, PerUnitRepository);
  container.registerSingleton(ItemGroupRepository, ItemGroupRepository);
  container.registerSingleton(ItemRepository, ItemRepository);
  container.registerSingleton(HsnCodeRepository, HsnCodeRepository);
  container.registerSingleton(PurchaseRepository, PurchaseRepository);
  container.registerSingleton(GodownStockRepository, GodownStockRepository);
  container.registerSingleton(StockSummaryRepository, StockSummaryRepository);
  container.registerSingleton(StockTransferRepository, StockTransferRepository);
  container.registerSingleton(SaleRepository, SaleRepository);
  container.registerSingleton(DebitNoteRepository, DebitNoteRepository);
  container.registerSingleton(CreditNoteRepository, CreditNoteRepository);

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

  container.registerSingleton(CreateSalesTypeUseCase, CreateSalesTypeUseCase);
  container.registerSingleton(UpdateSalesTypeUseCase, UpdateSalesTypeUseCase);
  container.registerSingleton(DeleteSalesTypeUseCase, DeleteSalesTypeUseCase);
  container.registerSingleton(GetSalesTypeListUseCase, GetSalesTypeListUseCase);

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

  container.registerSingleton(CreateHsnCodeUseCase, CreateHsnCodeUseCase);
  container.registerSingleton(UpdateHsnCodeUseCase, UpdateHsnCodeUseCase);
  container.registerSingleton(DeleteHsnCodeUseCase, DeleteHsnCodeUseCase);
  container.registerSingleton(GetHsnCodeListUseCase, GetHsnCodeListUseCase);

  container.registerSingleton(CreatePurchaseUseCase, CreatePurchaseUseCase);
  container.registerSingleton(UpdatePurchaseUseCase, UpdatePurchaseUseCase);
  container.registerSingleton(GetPurchaseListUseCase, GetPurchaseListUseCase);
  container.registerSingleton(GetPurchaseByIdUseCase, GetPurchaseByIdUseCase);
  container.registerSingleton(DeletePurchaseUseCase, DeletePurchaseUseCase);
  container.registerSingleton(GetStockSummaryUseCase, GetStockSummaryUseCase);
  container.registerSingleton(CreateStockTransferUseCase, CreateStockTransferUseCase);
  container.registerSingleton(GetStockTransferListUseCase, GetStockTransferListUseCase);
  container.registerSingleton(GetStockTransferByIdUseCase, GetStockTransferByIdUseCase);
  container.registerSingleton(GetAvailableStockForTransferUseCase, GetAvailableStockForTransferUseCase);
  container.registerSingleton(CreateSaleUseCase, CreateSaleUseCase);
  container.registerSingleton(UpdateSaleUseCase, UpdateSaleUseCase);
  container.registerSingleton(GetSaleListUseCase, GetSaleListUseCase);
  container.registerSingleton(GetSaleByIdUseCase, GetSaleByIdUseCase);
  container.registerSingleton(DeleteSaleUseCase, DeleteSaleUseCase);
  container.registerSingleton(GetAvailableStockForSaleUseCase, GetAvailableStockForSaleUseCase);

  container.registerSingleton(CreateDebitNoteUseCase, CreateDebitNoteUseCase);
  container.registerSingleton(UpdateDebitNoteUseCase, UpdateDebitNoteUseCase);
  container.registerSingleton(GetDebitNoteListUseCase, GetDebitNoteListUseCase);
  container.registerSingleton(GetDebitNoteByIdUseCase, GetDebitNoteByIdUseCase);
  container.registerSingleton(DeleteDebitNoteUseCase, DeleteDebitNoteUseCase);
  container.registerSingleton(GetAvailableStockForDebitNoteUseCase, GetAvailableStockForDebitNoteUseCase);

  container.registerSingleton(CreateCreditNoteUseCase, CreateCreditNoteUseCase);
  container.registerSingleton(UpdateCreditNoteUseCase, UpdateCreditNoteUseCase);
  container.registerSingleton(GetCreditNoteListUseCase, GetCreditNoteListUseCase);
  container.registerSingleton(GetCreditNoteByIdUseCase, GetCreditNoteByIdUseCase);
  container.registerSingleton(DeleteCreditNoteUseCase, DeleteCreditNoteUseCase);

  container.registerSingleton(CRUDAdminUserController, CRUDAdminUserController);
  container.registerSingleton(AdminStaticDataController, AdminStaticDataController);
  container.registerSingleton(GodownController, GodownController);
  container.registerSingleton(AccountInventoryController, AccountInventoryController);
  container.registerSingleton(PurchaseController, PurchaseController);
  container.registerSingleton(StockSummaryController, StockSummaryController);
  container.registerSingleton(StockTransferController, StockTransferController);
  container.registerSingleton(SaleController, SaleController);
  container.registerSingleton(DebitNoteController, DebitNoteController);
  container.registerSingleton(CreditNoteController, CreditNoteController);
};
