import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GetPurchaseListQueryDTO } from "@/shared/dto/admin/purchaseDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class GetPurchaseListUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetPurchaseListQueryDTO, reqAdmin: ReqAdminDTO) {
    try {
      const page = Number(dto.page) || 1;
      const limit = Number(dto.limit) || 20;
      const query: any = {};

      // Restrict purchases to godowns within user's hierarchy and regional scope
      const targetGodownIdInput = dto.companyGodownId || dto.godownId;

      if (reqAdmin.role === SuperAdmin.SUPER_ADMIN) {
        if (targetGodownIdInput) {
          const targetObjId = generateObjectId(targetGodownIdInput);
          query.$or = [
            { companyGodownId: targetObjId },
            { godownId: targetObjId },
            { "items.godownId": targetObjId },
          ];
        }
      } else {
        const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
        if (!hasAccess) {
          return {
            purchases: [],
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
              purchases: [],
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
            { godownId: targetObjId },
            { "items.godownId": targetObjId },
          ];
        } else {
          const accessibleGodownIds = await this.godownRepository.getGodownIdsByQuery(godownQuery);
          query.$or = [
            { companyGodownId: { $in: accessibleGodownIds } },
            { godownId: { $in: accessibleGodownIds } },
            { "items.godownId": { $in: accessibleGodownIds } },
          ];
        }
      }

      if (dto.search) {
        const searchRegex = { $regex: dto.search.trim(), $options: "i" };
        const searchConditions = [
          { purchaseNumber: searchRegex },
          { notes: searchRegex },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      if (dto.partyId) {
        query.partyId = generateObjectId(dto.partyId);
      }

      if (dto.itemId) {
        const itemObjId = generateObjectId(dto.itemId);
        const itemConditions = [{ itemId: itemObjId }, { "items.itemId": itemObjId }];
        if (query.$and) {
          query.$and.push({ $or: itemConditions });
        } else if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: itemConditions }];
          delete query.$or;
        } else {
          query.$or = itemConditions;
        }
      }

      if (dto.purchaseTypeId) {
        query.purchaseTypeId = generateObjectId(dto.purchaseTypeId);
      }

      if (dto.startDate || dto.endDate) {
        query.date = {};
        if (dto.startDate) query.date.$gte = new Date(dto.startDate);
        if (dto.endDate) query.date.$lte = new Date(dto.endDate);
      }

      const totalCount = await this.purchaseRepository.countPurchases(query);
      const totalPages = Math.ceil(totalCount / limit) || (totalCount === 0 ? 0 : 1);
      const validPage = totalCount === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
      const purchases = totalCount === 0
        ? []
        : await this.purchaseRepository.getPurchaseList(query, validPage, limit);

      const normalizedPurchases = purchases.map((p: any) => {
        if ((!p.items || p.items.length === 0) && p.itemId) {
          p.items = [
            {
              itemId: p.itemId,
              godownId: p.godownId,
              uomId: p.uomId,
              uomQuantity: p.uomQuantity ?? p.actualQuantity ?? 1,
              actualQuantity: p.actualQuantity ?? 0,
              billedQuantity: p.billedQuantity ?? 0,
              rate: p.rate ?? 0,
              perId: p.perId,
              amount: p.amount ?? 0,
            },
          ];
        }
        return p;
      });

      return {
        purchases: normalizedPurchases,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
          hasNextPage: totalCount > 0 && validPage < totalPages,
          hasPrevPage: totalCount > 0 && validPage > 1,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
