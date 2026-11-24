import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { Get, Post, Patch, Delete } from "@/application/decorators/HttpMethods";
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
  CreateSaleRouteSchema,
  UpdateSaleRouteSchema,
  DeleteSaleRouteSchema,
  GetSaleByIdRouteSchema,
  GetSaleListRouteSchema,
  GetAvailableStockForSaleRouteSchema,
} from "@/shared/validation/admin/sale/saleValidation";

import { CreateSaleUseCase } from "@/application/useCases/admin/Sale/CreateSaleUseCase";
import { UpdateSaleUseCase } from "@/application/useCases/admin/Sale/UpdateSaleUseCase";
import { GetSaleListUseCase } from "@/application/useCases/admin/Sale/GetSaleListUseCase";
import {
  GetSaleByIdUseCase,
  DeleteSaleUseCase,
} from "@/application/useCases/admin/Sale/SaleDetailsUseCases";
import { GetAvailableStockForSaleUseCase } from "@/application/useCases/admin/Sale/GetAvailableStockForSaleUseCase";

import {
  CreateSaleDTO,
  UpdateSaleDTO,
  GetSaleListQueryDTO,
  GetAvailableStockForSaleQueryDTO,
} from "@/shared/dto/admin/saleDTO";

@injectable()
@BasePath("/admin/sale")
export class SaleController {
  constructor(
    @inject(CreateSaleUseCase) private createSaleUseCase: CreateSaleUseCase,
    @inject(UpdateSaleUseCase) private updateSaleUseCase: UpdateSaleUseCase,
    @inject(GetSaleListUseCase) private getSaleListUseCase: GetSaleListUseCase,
    @inject(GetSaleByIdUseCase) private getSaleByIdUseCase: GetSaleByIdUseCase,
    @inject(DeleteSaleUseCase) private deleteSaleUseCase: DeleteSaleUseCase,
    @inject(GetAvailableStockForSaleUseCase) private getAvailableStockForSaleUseCase: GetAvailableStockForSaleUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreateSaleRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createSale(
    @Body() body: CreateSaleDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createSaleUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdateSaleRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateSale(
    @Params() params: { id: string },
    @Body() body: UpdateSaleDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateSaleUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }

  @Get("/list")
  @ValidateSchema(GetSaleListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getSaleList(
    @Query() query: GetSaleListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getSaleListUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }

  @Get("/available-stock")
  @ValidateSchema(GetAvailableStockForSaleRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAvailableStock(
    @Query() query: GetAvailableStockForSaleQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getAvailableStockForSaleUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.AVAILABLE_STOCK_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }

  @Get("/get-a-sale/:id")
  @ValidateSchema(GetSaleByIdRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getSaleById(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getSaleByIdUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeleteSaleRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteSale(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteSaleUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "SALE.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.SaleController, this.logger);
    }
  }
}
