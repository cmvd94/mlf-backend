import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CreditNoteRepository } from "@/infrastructure/repositories/admin/CreditNoteRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GetCreditNoteListQueryDTO } from "@/shared/dto/admin/creditNoteDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class GetCreditNoteListUseCase {
  constructor(
    @inject(CreditNoteRepository) private creditNoteRepository: CreditNoteRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetCreditNoteListQueryDTO, reqAdmin: ReqAdminDTO) {
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
            { godownId: targetObjId },
            { "items.godownId": targetObjId },
          ];
        }
      } else {
        const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
        if (!hasAccess) {
          return {
            creditNotes: [],
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
              creditNotes: [],
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
          { creditNoteNumber: searchRegex },
          { notes: searchRegex },
          { "items.dcNo": searchRegex },
          { "items.lotNo": searchRegex },
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

      const typeId = dto.creditNoteTypeId || dto.purchaseTypeId;
      if (typeId) {
        query.purchaseTypeId = generateObjectId(typeId);
      }

      const startDate = dto.startDate || dto.fromDate;
      const endDate = dto.endDate || dto.toDate;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const totalCount = await this.creditNoteRepository.countCreditNotes(query);
      const totalPages = Math.ceil(totalCount / limit) || (totalCount === 0 ? 0 : 1);
      const validPage = totalCount === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
      const creditNotes = totalCount === 0
        ? []
        : await this.creditNoteRepository.getCreditNoteList(query, validPage, limit);

      const normalizedCreditNotes = creditNotes.map((p: any) => {
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
        creditNotes: normalizedCreditNotes,
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
      ErrorHandler.handleError(error, AdminErrorStage.CreditNoteUseCase, this.logger);
    }
  }
}
