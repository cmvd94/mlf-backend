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
  CreateDebitNoteRouteSchema,
  UpdateDebitNoteRouteSchema,
  DeleteDebitNoteRouteSchema,
  GetDebitNoteByIdRouteSchema,
  GetDebitNoteListRouteSchema,
  GetAvailableStockForDebitNoteRouteSchema,
} from "@/shared/validation/admin/debitNote/debitNoteValidation";

import { CreateDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/CreateDebitNoteUseCase";
import { UpdateDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/UpdateDebitNoteUseCase";
import { GetDebitNoteListUseCase } from "@/application/useCases/admin/DebitNote/GetDebitNoteListUseCase";
import {
  GetDebitNoteByIdUseCase,
  DeleteDebitNoteUseCase,
} from "@/application/useCases/admin/DebitNote/DebitNoteDetailsUseCases";
import { GetAvailableStockForDebitNoteUseCase } from "@/application/useCases/admin/DebitNote/GetAvailableStockForDebitNoteUseCase";

import {
  CreateDebitNoteDTO,
  UpdateDebitNoteDTO,
  GetDebitNoteListQueryDTO,
  GetAvailableStockForDebitNoteQueryDTO,
} from "@/shared/dto/admin/debitNoteDTO";

@injectable()
@BasePath("/admin/debit-note")
export class DebitNoteController {
  constructor(
    @inject(CreateDebitNoteUseCase) private createDebitNoteUseCase: CreateDebitNoteUseCase,
    @inject(UpdateDebitNoteUseCase) private updateDebitNoteUseCase: UpdateDebitNoteUseCase,
    @inject(GetDebitNoteListUseCase) private getDebitNoteListUseCase: GetDebitNoteListUseCase,
    @inject(GetDebitNoteByIdUseCase) private getDebitNoteByIdUseCase: GetDebitNoteByIdUseCase,
    @inject(DeleteDebitNoteUseCase) private deleteDebitNoteUseCase: DeleteDebitNoteUseCase,
    @inject(GetAvailableStockForDebitNoteUseCase) private getAvailableStockForDebitNoteUseCase: GetAvailableStockForDebitNoteUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreateDebitNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createDebitNote(
    @Body() body: CreateDebitNoteDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createDebitNoteUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdateDebitNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateDebitNote(
    @Params() params: { id: string },
    @Body() body: UpdateDebitNoteDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateDebitNoteUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }

  @Get("/list")
  @ValidateSchema(GetDebitNoteListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getDebitNoteList(
    @Query() query: GetDebitNoteListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getDebitNoteListUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }

  @Get("/available-stock")
  @ValidateSchema(GetAvailableStockForDebitNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAvailableStockForDebitNote(
    @Query() query: GetAvailableStockForDebitNoteQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getAvailableStockForDebitNoteUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.AVAILABLE_STOCK_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }

  @Get("/get-a-debit-note/:id")
  @ValidateSchema(GetDebitNoteByIdRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getDebitNoteById(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getDebitNoteByIdUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeleteDebitNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteDebitNote(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteDebitNoteUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "DEBIT_NOTE.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.DebitNoteController, this.logger);
    }
  }
}
