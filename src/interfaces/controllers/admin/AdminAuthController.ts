import { BasePath } from "@/application/decorators/basePath";
import { Post } from "@/application/decorators/HttpMethods";
import { Body, Next, Req, Res } from "@/application/decorators/HttpParams";
import { ValidateSchema } from "@/application/decorators/validateSchemaDefineMetadata";
import { AdminLoginUseCase } from "@/application/useCases/admin/AuthAdmin/AdminLoginUseCase";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { sendResponse } from "@/shared/utils/responseUtil";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import {
  AdminLoginDTO,
  AdminLoginRouteSchema,
} from "@/shared/validation/admin/auth/AdminLoginValidation";
import { NextFunction, Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
@BasePath("/admin/auth")
export class AdminAuthController {
  constructor(
    @inject(AdminLoginUseCase)
    private adminLoginUseCase: AdminLoginUseCase,
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
}
