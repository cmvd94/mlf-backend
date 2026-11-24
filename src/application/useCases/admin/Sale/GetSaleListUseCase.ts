import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { SaleRepository } from "@/infrastructure/repositories/admin/SaleRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { GetSaleListQueryDTO } from "@/shared/dto/admin/saleDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class GetSaleListUseCase {
  constructor(
    @inject(SaleRepository) private saleRepository: SaleRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetSaleListQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      const page = Number(dto.page) || 1;
      const limit = Number(dto.limit) || 20;
      const query: any = {};

      const targetGodownIdInput = dto.companyGodownId || dto.godownId;

      if (reqAdmin.role === SuperAdmin.SUPER_ADMIN) {
        if (targetGodownIdInput) {
          const targetObjId = generateObjectId(targetGodownIdInput);
          query.$or = [
            { companyGodownId: targetObjId },
            { "items.godownId": targetObjId },
          ];
        }
      } else {
        const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
        if (!hasAccess) {
          return {
            sales: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalCount: 0,
              limit,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
        }

        if (targetGodownIdInput) {
          const targetGodown = await this.godownRepository.findGodownById(targetGodownIdInput);
          if (
            !targetGodown ||
            targetGodown.isDeleted ||
            !compareAdminAndGodownLocation(reqAdmin, targetGodown)
          ) {
            return {
              sales: [],
              pagination: {
                currentPage: 1,
                totalPages: 0,
                totalCount: 0,
                limit,
                hasNextPage: false,
                hasPrevPage: false,
              },
            };
          }
          const targetObjId = generateObjectId(targetGodownIdInput);
          query.$or = [
            { companyGodownId: targetObjId },
            { "items.godownId": targetObjId },
          ];
        } else {
          const accessibleGodownIds = await this.godownRepository.getGodownIdsByQuery(godownQuery);
          query.$or = [
            { companyGodownId: { $in: accessibleGodownIds } },
            { "items.godownId": { $in: accessibleGodownIds } },
          ];
        }
      }

      // Sales Type filter
      if (dto.salesTypeId) {
        query.salesTypeId = generateObjectId(dto.salesTypeId);
      }

      // Party filter
      if (dto.partyId) {
        query.partyId = generateObjectId(dto.partyId);
      }

      // Date range filters
      const fromDate = dto.fromDate || dto.startDate;
      const toDate = dto.toDate || dto.endDate;
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) {
          query.date.$gte = new Date(fromDate);
        }
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      // Search keyword filter
      if (dto.search && dto.search.trim().length > 0) {
        const searchRegex = { $regex: dto.search.trim(), $options: "i" };
        const matchingParties = await this.partyRepository.findPartiesByNameOrCode(dto.search.trim());
        const matchingPartyIds = matchingParties.map((p: any) => p._id);

        const searchConditions: any[] = [
          { salesNumber: searchRegex },
          { dcNo: searchRegex },
          { narration: searchRegex },
          { notes: searchRegex },
          { "items.dcNo": searchRegex },
          { "items.lotNo": searchRegex },
        ];

        if (matchingPartyIds.length > 0) {
          searchConditions.push({ partyId: { $in: matchingPartyIds } });
        }

        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      const { sales, totalCount, totalPages, currentPage } = await this.saleRepository.getSaleList(
        query,
        page,
        limit
      );

      return {
        sales,
        pagination: {
          currentPage,
          totalPages,
          totalCount,
          limit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SaleUseCase, this.logger);
    }
  }
}
