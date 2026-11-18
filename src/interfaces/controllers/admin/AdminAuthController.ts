import { BasePath } from "@/application/decorators/basePath";
import { Delete, Patch, Post } from "@/application/decorators/HttpMethods";
import { Body, Next, Req, ReqAdmin, Res } from "@/application/decorators/HttpParams";
import { IsAdminAuthenticated } from "@/application/decorators/adminDefineMetadata";
import { ValidateSchema } from "@/application/decorators/validateSchemaDefineMetadata";
import { AdminLoginUseCase } from "@/application/useCases/admin/AuthAdmin/AdminLoginUseCase";
import { AdminLogoutUseCase } from "@/application/useCases/admin/AuthAdmin/AdminLogoutUseCase";
import { ChangePasswordUseCase } from "@/application/useCases/admin/AuthAdmin/ChangePasswordUseCase";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { sendResponse } from "@/shared/utils/responseUtil";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import {
  AdminLoginDTO,
  AdminLoginRouteSchema,
} from "@/shared/validation/admin/auth/AdminLoginValidation";
import {
  ChangePasswordDTO,
  ChangePasswordRouteSchema,
} from "@/shared/validation/admin/auth/ChangePasswordValidation";
import { NextFunction, Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
@BasePath("/admin/auth")
export class AdminAuthController {
  constructor(
    @inject(AdminLoginUseCase)
    private adminLoginUseCase: AdminLoginUseCase,
    @inject(ChangePasswordUseCase)
    private changePasswordUseCase: ChangePasswordUseCase,
    @inject(AdminLogoutUseCase)
    private adminLogoutUseCase: AdminLogoutUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Post("/login")
  @ValidateSchema(AdminLoginRouteSchema)
  public async login(
    @Body() body: AdminLoginDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const { phoneNumber, password } = body;
      const result = await this.adminLoginUseCase.execute(
        phoneNumber,
        password
      );
      res
        .status(200)
        .json(sendResponse(req, "Admin login successful", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.AdminLoginController,
        this.logger
      );
    }
  }

  @Patch("/change-password")
  @IsAdminAuthenticated()
  @ValidateSchema(ChangePasswordRouteSchema)
  public async changePassword(
    @Body() body: ChangePasswordDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.changePasswordUseCase.execute(
        reqAdmin.userId,
        body
      );
      res
        .status(200)
        .json(
          sendResponse(req, "ADMIN_AUTH.PASSWORD_CHANGED", this.logger, result)
        );
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.ChangePasswordUseCase,
        this.logger
      );
    }
  }

  @Patch("/logout")
  @IsAdminAuthenticated()
  public async logout(
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.adminLogoutUseCase.execute(reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "ADMIN_AUTH.LOGOUT_SUCCESS", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.AdminLogoutController,
        this.logger
      );
    }
  }

  @Delete("/logout-all")
  @IsAdminAuthenticated()
  public async logoutAll(
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.adminLogoutUseCase.executeAll(reqAdmin);
      res
        .status(200)
        .json(sendResponse(req, "ADMIN_AUTH.LOGOUT_ALL", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.AdminLogoutController,
        this.logger
      );
    }
  }
}
