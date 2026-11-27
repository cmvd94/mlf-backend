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
import {
  ROLE_GUARD_ALL,
  ROLE_GUARD_TILL_MID_LEVEL_ADMIN,
  ROLE_GUARD_ONLY_SUPERADMIN,
} from "@/shared/constants/adminRoleGuardType";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import { sendResponse } from "@/shared/utils/responseUtil";
import { ValidateSchema } from "@/application/decorators/validateSchemaDefineMetadata";

import { CreateGodownRouteSchema } from "@/shared/validation/admin/godown/createGodown";
import { UpdateGodownRouteSchema } from "@/shared/validation/admin/godown/updateGodown";
import { GetGodownListRouteSchema } from "@/shared/validation/admin/godown/getGodownList";
import { GetAGodownRouteSchema } from "@/shared/validation/admin/godown/getAGodown";
import { DeleteGodownRouteSchema } from "@/shared/validation/admin/godown/deleteGodown";
import { UpdateGodownIsActiveRouteSchema } from "@/shared/validation/admin/godown/updateGodownIsActive";
import { GetEligibleGodownAdminsRouteSchema } from "@/shared/validation/admin/godown/getEligibleAdmins";

import { CreateGodownUseCase } from "@/application/useCases/admin/Godown/CreateGodownUseCase";
import { UpdateGodownUseCase } from "@/application/useCases/admin/Godown/UpdateGodownUseCase";
import { GetAGodownUseCase } from "@/application/useCases/admin/Godown/GetAGodownUseCase";
import { GetGodownListUseCase } from "@/application/useCases/admin/Godown/GetGodownListUseCase";
import { DeleteGodownUseCase } from "@/application/useCases/admin/Godown/DeleteGodownUseCase";
import { UpdateGodownIsActiveUseCase } from "@/application/useCases/admin/Godown/UpdateGodownIsActiveUseCase";
import { GetEligibleGodownAdminsUseCase } from "@/application/useCases/admin/Godown/GetEligibleGodownAdminsUseCase";
import { GetGodownStockUseCase } from "@/application/useCases/admin/Godown/GetGodownStockUseCase";

import {
  CreateGodownDTO,
  GetEligibleGodownAdminsQueryDTO,
  GetGodownListQueryDTO,
  GetGodownParamsDTO,
  UpdateGodownDTO,
  UpdateGodownIsActiveDTO,
} from "@/shared/dto/admin/godownDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

@injectable()
@BasePath("/admin/godown")
export class GodownController {
  constructor(
    @inject(CreateGodownUseCase)
    private createGodownUseCase: CreateGodownUseCase,
    @inject(UpdateGodownUseCase)
    private updateGodownUseCase: UpdateGodownUseCase,
    @inject(GetAGodownUseCase)
    private getAGodownUseCase: GetAGodownUseCase,
    @inject(GetGodownListUseCase)
    private getGodownListUseCase: GetGodownListUseCase,
    @inject(DeleteGodownUseCase)
    private deleteGodownUseCase: DeleteGodownUseCase,
    @inject(UpdateGodownIsActiveUseCase)
    private updateGodownIsActiveUseCase: UpdateGodownIsActiveUseCase,
    @inject(GetEligibleGodownAdminsUseCase)
    private getEligibleGodownAdminsUseCase: GetEligibleGodownAdminsUseCase,
    @inject(GetGodownStockUseCase)
    private getGodownStockUseCase: GetGodownStockUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create")
  @ValidateSchema(CreateGodownRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_MID_LEVEL_ADMIN)
  public async createGodown(
    @Body() body: CreateGodownDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createGodownUseCase.execute(body, reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Patch("/update/:id")
  @ValidateSchema(UpdateGodownRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_MID_LEVEL_ADMIN)
  public async updateGodown(
    @Params() params: GetGodownParamsDTO,
    @Body() body: UpdateGodownDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateGodownUseCase.execute(
        params.id,
        body,
        reqAdmin
      );
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Get("/get-a-godown/:id")
  @ValidateSchema(GetAGodownRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAGodown(
    @Params() params: GetGodownParamsDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getAGodownUseCase.execute(params.id, reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Get("/stock/:id")
  @ValidateSchema(GetAGodownRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getGodownStock(
    @Params() params: GetGodownParamsDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getGodownStockUseCase.execute(params.id, reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Get("/get-godown-list")
  @ValidateSchema(GetGodownListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getGodownList(
    @Query() query: GetGodownListQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getGodownListUseCase.execute(query, reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.LIST_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Patch("/update-is-active")
  @ValidateSchema(UpdateGodownIsActiveRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_MID_LEVEL_ADMIN)
  public async updateGodownIsActive(
    @Body() body: UpdateGodownIsActiveDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateGodownIsActiveUseCase.execute(
        body,
        reqAdmin
      );
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.STATUS_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Delete("/delete/:id")
  @ValidateSchema(DeleteGodownRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_MID_LEVEL_ADMIN)
  public async deleteGodown(
    @Params() params: GetGodownParamsDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteGodownUseCase.execute(
        params.id,
        reqAdmin
      );
      res
        .status(200)
        .json(sendResponse(req, "GODOWN.DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }

  @Get("/eligible-admins")
  @ValidateSchema(GetEligibleGodownAdminsRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ONLY_SUPERADMIN)
  public async getEligibleAdmins(
    @Query() query: GetEligibleGodownAdminsQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getEligibleGodownAdminsUseCase.execute(
        query,
        reqAdmin
      );
      res
        .status(200)
        .json(
          sendResponse(
            req,
            "GODOWN.ELIGIBLE_ADMINS_FETCHED",
            this.logger,
            result
          )
        );
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.GodownController,
        this.logger
      );
    }
  }
}
