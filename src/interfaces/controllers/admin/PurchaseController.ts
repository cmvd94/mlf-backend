import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { Get, Post, Delete, Patch } from "@/application/decorators/HttpMethods";
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
  CreatePurchaseRouteSchema,
  DeletePurchaseRouteSchema,
  GetPurchaseByIdRouteSchema,
  UpdatePurchaseRouteSchema,
} from "@/shared/validation/admin/purchase/purchaseValidation";

import { CreatePurchaseUseCase } from "@/application/useCases/admin/Purchase/CreatePurchaseUseCase";
import { UpdatePurchaseUseCase } from "@/application/useCases/admin/Purchase/UpdatePurchaseUseCase";
import { GetPurchaseListUseCase } from "@/application/useCases/admin/Purchase/GetPurchaseListUseCase";
import {
  GetPurchaseByIdUseCase,
  DeletePurchaseUseCase,
} from "@/application/useCases/admin/Purchase/PurchaseDetailsUseCases";

import {
  CreatePurchaseDTO,
  UpdatePurchaseDTO,
  GetPurchaseListQueryDTO,
} from "@/shared/dto/admin/purchaseDTO";

@injectable()
@BasePath("/admin/purchase")
export class PurchaseController {
  constructor(
    @inject(CreatePurchaseUseCase) private createPurchaseUseCase: CreatePurchaseUseCase,
    @inject(UpdatePurchaseUseCase) private updatePurchaseUseCase: UpdatePurchaseUseCase,
    @inject(GetPurchaseListUseCase) private getPurchaseListUseCase: GetPurchaseListUseCase,
    @inject(GetPurchaseByIdUseCase) private getPurchaseByIdUseCase: GetPurchaseByIdUseCase,
    @inject(DeletePurchaseUseCase) private deletePurchaseUseCase: DeletePurchaseUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreatePurchaseRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createPurchase(
    @Body() body: CreatePurchaseDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createPurchaseUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "PURCHASE.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.PurchaseController, this.logger);
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdatePurchaseRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updatePurchase(
    @Params() params: { id: string },
    @Body() body: UpdatePurchaseDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updatePurchaseUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "PURCHASE.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.PurchaseController, this.logger);
    }
  }

  @Get("/list")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getPurchaseList(
    @Query() query: GetPurchaseListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getPurchaseListUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "PURCHASE.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.PurchaseController, this.logger);
    }
  }

  @Get("/get-a-purchase/:id")
  @ValidateSchema(GetPurchaseByIdRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getPurchaseById(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getPurchaseByIdUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "PURCHASE.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.PurchaseController, this.logger);
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeletePurchaseRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deletePurchase(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deletePurchaseUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "PURCHASE.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.PurchaseController, this.logger);
    }
  }
}
