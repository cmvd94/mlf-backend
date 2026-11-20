import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { Get, Patch, Post, Delete } from "@/application/decorators/HttpMethods";
import {
  Body,
  Params,
  Query,
  ReqAdmin,
  Req,
  Res,
  Next,
} from "@/application/decorators/HttpParams";
import { ROLE_GUARD_ALL } from "@/shared/constants/adminRoleGuardType";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import { sendResponse } from "@/shared/utils/responseUtil";
import { ValidateSchema } from "@/application/decorators/validateSchemaDefineMetadata";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

import {
  CreatePartyRouteSchema,
  UpdatePartyRouteSchema,
  DeletePartyRouteSchema,
} from "@/shared/validation/admin/inventory/partyValidation";
import {
  CreatePurchaseTypeRouteSchema,
  UpdatePurchaseTypeRouteSchema,
  DeletePurchaseTypeRouteSchema,
} from "@/shared/validation/admin/inventory/purchaseTypeValidation";
import {
  CreateUomRouteSchema,
  UpdateUomRouteSchema,
  DeleteUomRouteSchema,
} from "@/shared/validation/admin/inventory/uomValidation";
import {
  CreatePerUnitRouteSchema,
  UpdatePerUnitRouteSchema,
  DeletePerUnitRouteSchema,
} from "@/shared/validation/admin/inventory/perUnitValidation";
import {
  CreateItemGroupRouteSchema,
  UpdateItemGroupRouteSchema,
  DeleteItemGroupRouteSchema,
} from "@/shared/validation/admin/inventory/itemGroupValidation";
import {
  CreateItemRouteSchema,
  UpdateItemRouteSchema,
  DeleteItemRouteSchema,
} from "@/shared/validation/admin/inventory/itemValidation";

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

import {
  CreatePartyDTO,
  UpdatePartyDTO,
  CreatePurchaseTypeDTO,
  UpdatePurchaseTypeDTO,
  CreateUomDTO,
  UpdateUomDTO,
  CreatePerUnitDTO,
  UpdatePerUnitDTO,
  CreateItemGroupDTO,
  UpdateItemGroupDTO,
  CreateItemDTO,
  UpdateItemDTO,
  InventoryQueryDTO,
} from "@/shared/dto/admin/inventoryDTO";

@injectable()
@BasePath("/admin/account-inventory")
export class AccountInventoryController {
  constructor(
    @inject(GetMastersUseCase) private getMastersUseCase: GetMastersUseCase,
    @inject(CreatePartyUseCase) private createPartyUseCase: CreatePartyUseCase,
    @inject(UpdatePartyUseCase) private updatePartyUseCase: UpdatePartyUseCase,
    @inject(DeletePartyUseCase) private deletePartyUseCase: DeletePartyUseCase,
    @inject(GetPartyListUseCase) private getPartyListUseCase: GetPartyListUseCase,
    @inject(CreatePurchaseTypeUseCase) private createPurchaseTypeUseCase: CreatePurchaseTypeUseCase,
    @inject(UpdatePurchaseTypeUseCase) private updatePurchaseTypeUseCase: UpdatePurchaseTypeUseCase,
    @inject(DeletePurchaseTypeUseCase) private deletePurchaseTypeUseCase: DeletePurchaseTypeUseCase,
    @inject(GetPurchaseTypeListUseCase) private getPurchaseTypeListUseCase: GetPurchaseTypeListUseCase,
    @inject(CreateUomUseCase) private createUomUseCase: CreateUomUseCase,
    @inject(UpdateUomUseCase) private updateUomUseCase: UpdateUomUseCase,
    @inject(DeleteUomUseCase) private deleteUomUseCase: DeleteUomUseCase,
    @inject(GetUomListUseCase) private getUomListUseCase: GetUomListUseCase,
    @inject(CreatePerUnitUseCase) private createPerUnitUseCase: CreatePerUnitUseCase,
    @inject(UpdatePerUnitUseCase) private updatePerUnitUseCase: UpdatePerUnitUseCase,
    @inject(DeletePerUnitUseCase) private deletePerUnitUseCase: DeletePerUnitUseCase,
    @inject(GetPerUnitListUseCase) private getPerUnitListUseCase: GetPerUnitListUseCase,
    @inject(CreateItemGroupUseCase) private createItemGroupUseCase: CreateItemGroupUseCase,
    @inject(UpdateItemGroupUseCase) private updateItemGroupUseCase: UpdateItemGroupUseCase,
    @inject(DeleteItemGroupUseCase) private deleteItemGroupUseCase: DeleteItemGroupUseCase,
    @inject(GetItemGroupListUseCase) private getItemGroupListUseCase: GetItemGroupListUseCase,
    @inject(CreateItemUseCase) private createItemUseCase: CreateItemUseCase,
    @inject(UpdateItemUseCase) private updateItemUseCase: UpdateItemUseCase,
    @inject(DeleteItemUseCase) private deleteItemUseCase: DeleteItemUseCase,
    @inject(GetItemListUseCase) private getItemListUseCase: GetItemListUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  // ---------------- Consolidated Masters for Dropdowns ----------------
  @Get("/masters")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getMasters(
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getMastersUseCase.execute(reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.MASTERS_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- Party CRUD ----------------
  @Post("/party/create")
  @ValidateSchema(CreatePartyRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createParty(
    @Body() body: CreatePartyDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createPartyUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PARTY_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/party/update/:id")
  @ValidateSchema(UpdatePartyRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateParty(
    @Params() params: { id: string },
    @Body() body: UpdatePartyDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updatePartyUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PARTY_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/party/delete/:id")
  @ValidateSchema(DeletePartyRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteParty(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deletePartyUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PARTY_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/party/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getPartyList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getPartyListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.PARTY_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- Purchase Type CRUD ----------------
  @Post("/purchase-type/create")
  @ValidateSchema(CreatePurchaseTypeRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createPurchaseType(
    @Body() body: CreatePurchaseTypeDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createPurchaseTypeUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PURCHASE_TYPE_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/purchase-type/update/:id")
  @ValidateSchema(UpdatePurchaseTypeRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updatePurchaseType(
    @Params() params: { id: string },
    @Body() body: UpdatePurchaseTypeDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updatePurchaseTypeUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PURCHASE_TYPE_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/purchase-type/delete/:id")
  @ValidateSchema(DeletePurchaseTypeRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deletePurchaseType(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deletePurchaseTypeUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PURCHASE_TYPE_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/purchase-type/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getPurchaseTypeList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getPurchaseTypeListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.PURCHASE_TYPE_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- UOM CRUD ----------------
  @Post("/uom/create")
  @ValidateSchema(CreateUomRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createUom(
    @Body() body: CreateUomDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createUomUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.UOM_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/uom/update/:id")
  @ValidateSchema(UpdateUomRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateUom(
    @Params() params: { id: string },
    @Body() body: UpdateUomDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateUomUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.UOM_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/uom/delete/:id")
  @ValidateSchema(DeleteUomRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteUom(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteUomUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.UOM_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/uom/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getUomList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getUomListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.UOM_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- Per Unit CRUD ----------------
  @Post("/per-unit/create")
  @ValidateSchema(CreatePerUnitRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createPerUnit(
    @Body() body: CreatePerUnitDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createPerUnitUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PER_UNIT_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/per-unit/update/:id")
  @ValidateSchema(UpdatePerUnitRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updatePerUnit(
    @Params() params: { id: string },
    @Body() body: UpdatePerUnitDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updatePerUnitUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PER_UNIT_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/per-unit/delete/:id")
  @ValidateSchema(DeletePerUnitRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deletePerUnit(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deletePerUnitUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.PER_UNIT_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/per-unit/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getPerUnitList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getPerUnitListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.PER_UNIT_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- Item Group CRUD ----------------
  @Post("/item-group/create")
  @ValidateSchema(CreateItemGroupRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createItemGroup(
    @Body() body: CreateItemGroupDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createItemGroupUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_GROUP_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/item-group/update/:id")
  @ValidateSchema(UpdateItemGroupRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateItemGroup(
    @Params() params: { id: string },
    @Body() body: UpdateItemGroupDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateItemGroupUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_GROUP_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/item-group/delete/:id")
  @ValidateSchema(DeleteItemGroupRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteItemGroup(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteItemGroupUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_GROUP_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/item-group/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getItemGroupList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getItemGroupListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_GROUP_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  // ---------------- Item CRUD ----------------
  @Post("/item/create")
  @ValidateSchema(CreateItemRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createItem(
    @Body() body: CreateItemDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createItemUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Patch("/item/update/:id")
  @ValidateSchema(UpdateItemRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateItem(
    @Params() params: { id: string },
    @Body() body: UpdateItemDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateItemUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Delete("/item/delete/:id")
  @ValidateSchema(DeleteItemRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteItem(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteItemUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }

  @Get("/item/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getItemList(
    @Query() query: InventoryQueryDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getItemListUseCase.execute(query);
      res.status(200).json(sendResponse(req, "INVENTORY.ITEM_LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }
}
