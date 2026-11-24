import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import {
  IsAdminAuthenticated,
  AdminRoleGuard,
} from "@/application/decorators/adminDefineMetadata";
import { BasePath } from "@/application/decorators/basePath";
import { Get } from "@/application/decorators/HttpMethods";
import {
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
  GetStockSummaryRouteSchema,
  GetGroupStockSummaryRouteSchema,
} from "@/shared/validation/admin/stockSummary/stockSummaryValidation";
import { GetStockSummaryUseCase } from "@/application/useCases/admin/Inventory/GetStockSummaryUseCase";
import { GetStockSummaryQueryDTO } from "@/shared/dto/admin/stockSummaryDTO";

@injectable()
@BasePath("/admin/stock-summary")
export class StockSummaryController {
  constructor(
    @inject(GetStockSummaryUseCase) private getStockSummaryUseCase: GetStockSummaryUseCase,
    @inject("AdminLogger") private logger: Logger
  ) {}

  @Get("/")
  @ValidateSchema(GetStockSummaryRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getStockSummary(
    @Query() query: GetStockSummaryQueryDTO,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getStockSummaryUseCase.execute(query, reqAdmin);
      res.status(200).json(sendResponse(req, "STOCK_SUMMARY.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockSummaryController, this.logger);
    }
  }

  @Get("/group/:groupId")
  @ValidateSchema(GetGroupStockSummaryRouteSchema)
  @IsAdminAuthenticated()
  @AdminRoleGuard(ROLE_GUARD_ALL)
  public async getGroupStockSummary(
    @Params() params: { groupId: string },
    @Query() query: Omit<GetStockSummaryQueryDTO, "groupId">,
    @ReqAdmin() reqAdmin: ReqAdminDTO,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    try {
      const result = await this.getStockSummaryUseCase.execute(
        { ...query, groupId: params.groupId },
        reqAdmin
      );
      res.status(200).json(sendResponse(req, "STOCK_SUMMARY.FETCHED", this.logger, result));
    } catch (error) {
      sendErrorResponse(req, res, next, error, AdminErrorStage.StockSummaryController, this.logger);
    }
  }
}
