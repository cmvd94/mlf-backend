import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { Get, Post, Put, Patch, Delete } from "@/application/decorators/HttpMethods";
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
  CreateStockTransferRouteSchema,
  UpdateStockTransferRouteSchema,
  DeleteStockTransferRouteSchema,
  GetStockTransferListRouteSchema,
  GetAvailableStockRouteSchema,
} from "@/shared/validation/admin/stockTransfer/stockTransferValidation";

import { CreateStockTransferUseCase } from "@/application/useCases/admin/StockTransfer/CreateStockTransferUseCase";
import { UpdateStockTransferUseCase } from "@/application/useCases/admin/StockTransfer/UpdateStockTransferUseCase";
import { DeleteStockTransferUseCase } from "@/application/useCases/admin/StockTransfer/DeleteStockTransferUseCase";
import { GetStockTransferListUseCase } from "@/application/useCases/admin/StockTransfer/GetStockTransferListUseCase";
import { GetStockTransferByIdUseCase } from "@/application/useCases/admin/StockTransfer/GetStockTransferByIdUseCase";
import { GetAvailableStockForTransferUseCase } from "@/application/useCases/admin/StockTransfer/GetAvailableStockForTransferUseCase";

import {
  CreateStockTransferDTO,
  UpdateStockTransferDTO,
  GetStockTransferListQueryDTO,
  GetAvailableStockQueryDTO,
} from "@/shared/dto/admin/stockTransferDTO";

@injectable()
@BasePath("/admin/stock-transfer")
export class StockTransferController {
  constructor(
    @inject(CreateStockTransferUseCase) private createStockTransferUseCase: CreateStockTransferUseCase,
    @inject(UpdateStockTransferUseCase) private updateStockTransferUseCase: UpdateStockTransferUseCase,
    @inject(DeleteStockTransferUseCase) private deleteStockTransferUseCase: DeleteStockTransferUseCase,
    @inject(GetStockTransferListUseCase) private getStockTransferListUseCase: GetStockTransferListUseCase,
    @inject(GetStockTransferByIdUseCase) private getStockTransferByIdUseCase: GetStockTransferByIdUseCase,
    @inject(GetAvailableStockForTransferUseCase) private getAvailableStockForTransferUseCase: GetAvailableStockForTransferUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreateStockTransferRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createStockTransfer(
    @Body() body: CreateStockTransferDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createStockTransferUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Get("/available-stock")
  @ValidateSchema(GetAvailableStockRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAvailableStock(
    @Query() query: GetAvailableStockQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getAvailableStockForTransferUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.AVAILABLE_STOCK_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Get("/list")
  @ValidateSchema(GetStockTransferListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getStockTransferList(
    @Query() query: GetStockTransferListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getStockTransferListUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Get("/:id")
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getStockTransferById(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getStockTransferByIdUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Put("/:id")
  @ValidateSchema(UpdateStockTransferRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateStockTransfer(
    @Params() params: { id: string },
    @Body() body: UpdateStockTransferDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateStockTransferUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdateStockTransferRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async patchStockTransfer(
    @Params() params: { id: string },
    @Body() body: UpdateStockTransferDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateStockTransferUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Delete("/:id")
  @ValidateSchema(DeleteStockTransferRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteStockTransfer(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteStockTransferUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeleteStockTransferRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteStockTransferAlias(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteStockTransferUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_TRANSFER.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockTransferController, this.logger);
    }
  }
}
