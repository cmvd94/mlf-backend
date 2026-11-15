import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { ValidateSchema } from "@/application/decorators/validateSchemaDefineMetadata";
import {
  ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR,
  ROLE_GUARD_ALL,
} from "@/shared/constants/adminRoleGuardType";
import { injectable, inject } from "tsyringe";
import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";

import { sendResponse } from "@/shared/utils/responseUtil";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import { AdminErrorStage } from "@/shared/constants/errorStage";

import { Get, Patch, Post, Delete } from "@/application/decorators/HttpMethods";

import { CreateUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/CreateUserUseCase";
import { DeleteUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/DeleteUserUseCase";
import { GetAUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/GetAUserUseCase";
import { GetUserListUseCase } from "@/application/useCases/admin/CRUDAdminUser/GetUserListUseCase";
import { UpdateUserUseCase } from "@/application/useCases/admin/CRUDAdminUser/UpdateUserUseCase";
import { UpdateUserIsActiveUseCase } from "@/application/useCases/admin/CRUDAdminUser/UpdateUserIsActiveUseCase";
import {
  Body,
  Params,
  ReqAdmin,
  Req,
  Res,
  Next,
  Query,
} from "@/application/decorators/HttpParams";
import { CreateAdminUserRouteSchema } from "@/shared/validation/admin/crudAdminUser/CreateAdmin";
import { UpdateAdminUserRouteSchema } from "@/shared/validation/admin/crudAdminUser/updateAdmin";
import { GetAdminUserListRouteSchema } from "@/shared/validation/admin/crudAdminUser/getAdminList";
import { GetAAdminRouteSchema } from "@/shared/validation/admin/crudAdminUser/getAAdmin";
import { DeleteAdminRouteSchema } from "@/shared/validation/admin/crudAdminUser/deleteAdmin";
import { updateIsActiveRouteSchema } from "@/shared/validation/admin/crudAdminUser/updateIsActive";
import {
  CreateAdminUserDTO,
  GetAAdminDTO,
  GetAdminUsersFilterDTO,
  UpdateAdminUserDTO,
  UpdateAdminUserParamsDTO,
  DeleteAdminDTO,
  UpdateIsActiveUserDTO,
} from "@/shared/dto/admin/crudUserDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";

@injectable()
@BasePath("/admin/crud")
export class CRUDAdminUserController {
  constructor(
    @inject(CreateUserUseCase) private createUserUseCase: CreateUserUseCase,
    @inject(UpdateUserUseCase) private updateUserUseCase: UpdateUserUseCase,
    @inject(DeleteUserUseCase) private deleteUserUseCase: DeleteUserUseCase,
    @inject(GetUserListUseCase) private getUserListUseCase: GetUserListUseCase,
    @inject(GetAUserUseCase) private getAUserUseCase: GetAUserUseCase,
    @inject(UpdateUserIsActiveUseCase)
    private updateIsActiveUserUseCase: UpdateUserIsActiveUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/create-admin")
  @ValidateSchema(CreateAdminUserRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR)
  public async createAdminUser(
    @Body() body: CreateAdminUserDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.createUserUseCase.execute(body, reqAdmin);

      res
        .status(200)
        .json(sendResponse(req, "CRUDADMIN.USER_CREATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }

  @Patch("/update-admin/:userId")
  @ValidateSchema(UpdateAdminUserRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR)
  public async updateAdminUser(
    @Params() params: UpdateAdminUserParamsDTO,
    @Body() body: UpdateAdminUserDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const userId = params.userId;
      const result = await this.updateUserUseCase.execute(
        userId,
        body,
        reqAdmin
      );
      res
        .status(200)
        .json(sendResponse(req, "CRUDADMIN.USER_UPDATED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }

  @Get("/get-user-list")
  @ValidateSchema(GetAdminUserListRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAdminUserList(
    @Query() query: GetAdminUsersFilterDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getUserListUseCase.execute(
        reqAdmin.userId,
        query
      );
      res
        .status(200)
        .json(
          sendResponse(req, "CRUDADMIN.QUERIED_USER_LIST", this.logger, result)
        );
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }

  @Get("/get-a-user/:userId")
  @ValidateSchema(GetAAdminRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getAUser(
    @Params() params: GetAAdminDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const userId = params.userId;
      const result = await this.getAUserUseCase.execute(userId);
      res
        .status(200)
        .json(sendResponse(req, "CRUDADMIN.USER_FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }

  @Delete("/delete-admin/:userId")
  @ValidateSchema(DeleteAdminRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR)
  public async deleteAdminUser(
    @Params() params: DeleteAdminDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.deleteUserUseCase.execute(params, reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "CRUDADMIN.USER_DELETED", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }

  @Patch("/update-is-active-user")
  @ValidateSchema(updateIsActiveRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_TILL_WAREHOUSE_SUPERVISOR)
  public async updateIsActiveUser(
    @Body() body: UpdateIsActiveUserDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.updateIsActiveUserUseCase.execute(
        body,
        reqAdmin
      );
      res
        .status(200)
        .json(
          sendResponse(
            req,
            "CRUDADMIN.USER_IS_ACTIVE_UPDATED",
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
        AdminErrorStage.CRUDAdminController,
        this.logger
      );
    }
  }
}
