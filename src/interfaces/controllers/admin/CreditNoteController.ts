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
  CreateCreditNoteRouteSchema,
  DeleteCreditNoteRouteSchema,
  GetCreditNoteByIdRouteSchema,
  UpdateCreditNoteRouteSchema,
  GetCreditNoteListRouteSchema,
} from "@/shared/validation/admin/creditNote/creditNoteValidation";

import { CreateCreditNoteUseCase } from "@/application/useCases/admin/CreditNote/CreateCreditNoteUseCase";
import { UpdateCreditNoteUseCase } from "@/application/useCases/admin/CreditNote/UpdateCreditNoteUseCase";
import { GetCreditNoteListUseCase } from "@/application/useCases/admin/CreditNote/GetCreditNoteListUseCase";
import {
  GetCreditNoteByIdUseCase,
  DeleteCreditNoteUseCase,
} from "@/application/useCases/admin/CreditNote/CreditNoteDetailsUseCases";

import {
  CreateCreditNoteDTO,
  UpdateCreditNoteDTO,
  GetCreditNoteListQueryDTO,
} from "@/shared/dto/admin/creditNoteDTO";

@injectable()
@BasePath("/admin/credit-note")
export class CreditNoteController {
  constructor(
    @inject(CreateCreditNoteUseCase) private createCreditNoteUseCase: CreateCreditNoteUseCase,
    @inject(UpdateCreditNoteUseCase) private updateCreditNoteUseCase: UpdateCreditNoteUseCase,
    @inject(GetCreditNoteListUseCase) private getCreditNoteListUseCase: GetCreditNoteListUseCase,
    @inject(GetCreditNoteByIdUseCase) private getCreditNoteByIdUseCase: GetCreditNoteByIdUseCase,
    @inject(DeleteCreditNoteUseCase) private deleteCreditNoteUseCase: DeleteCreditNoteUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreateCreditNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async createCreditNote(
    @Body() body: CreateCreditNoteDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createCreditNoteUseCase.execute(body, reqAdmin);
      res.status(200).json(sendResponse(req, "CREDIT_NOTE.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.CreditNoteController, this.logger);
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdateCreditNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async updateCreditNote(
    @Params() params: { id: string },
    @Body() body: UpdateCreditNoteDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateCreditNoteUseCase.execute(params.id, body, reqAdmin);
      res.status(200).json(sendResponse(req, "CREDIT_NOTE.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.CreditNoteController, this.logger);
    }
  }

  @Get("/list")
  @ValidateSchema(GetCreditNoteListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getCreditNoteList(
    @Query() query: GetCreditNoteListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getCreditNoteListUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "CREDIT_NOTE.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.CreditNoteController, this.logger);
    }
  }

  @Get("/get-a-credit-note/:id")
  @ValidateSchema(GetCreditNoteByIdRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getCreditNoteById(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getCreditNoteByIdUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "CREDIT_NOTE.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.CreditNoteController, this.logger);
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeleteCreditNoteRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async deleteCreditNote(
    @Params() params: { id: string },
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteCreditNoteUseCase.execute(params.id, reqAdmin);
      res.status(200).json(sendResponse(req, "CREDIT_NOTE.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.CreditNoteController, this.logger);
    }
  }
}
