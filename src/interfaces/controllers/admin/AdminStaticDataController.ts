import { BasePath } from "@/application/decorators/basePath";
import { Get } from "@/application/decorators/HttpMethods";
import { Req, Res, Next } from "@/application/decorators/HttpParams";
import { AdminStaticDataUseCase } from "@/application/useCases/admin/AdminStaticDataUseCase";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { sendResponse } from "@/shared/utils/responseUtil";
import { sendErrorResponse } from "@/shared/utils/sendErrorResponse";
import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
@BasePath("/admin")
export class AdminStaticDataController {
  constructor(
    @inject(AdminStaticDataUseCase)
    private adminStaticDataUseCase: AdminStaticDataUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Get("/static-data")
  public async data(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.adminStaticDataUseCase.execute();

      res
        .status(200)
        .json(sendResponse(req, "ADMIN.STATIC_DATA", this.logger, result));
    } catch (error) {
      sendErrorResponse(
        req,
        res,
        next,
        error,
        AdminErrorStage.AdminStaticDataController,
        this.logger
      );
    }
  }
}
