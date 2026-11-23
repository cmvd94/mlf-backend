import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { CreateSalesTypeDTO, UpdateSalesTypeDTO } from "@/shared/dto/admin/salesTypeDTO";
import { InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreateSalesTypeUseCase {
  constructor(
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateSalesTypeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const typeId = await this.salesTypeRepository.createSalesType({
        name: dto.name.trim(),
        code: dto.code?.trim() || dto.name.trim().toUpperCase().replace(/\s+/g, "_"),
        description: dto.description?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.salesTypeRepository.getSalesTypeById(typeId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SalesTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdateSalesTypeUseCase {
  constructor(
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateSalesTypeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.code !== undefined) updateData.code = dto.code.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.salesTypeRepository.updateSalesType(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SalesTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteSalesTypeUseCase {
  constructor(
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.salesTypeRepository.deleteSalesType(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SalesTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class GetSalesTypeListUseCase {
  constructor(
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: InventoryQueryDTO) {
    try {
      const page = Number(dto.page) || 1;
      const limit = Number(dto.limit) || 20;
      const query: any = {};

      if (dto.search) {
        query.$or = [
          { name: { $regex: dto.search.trim(), $options: "i" } },
          { code: { $regex: dto.search.trim(), $options: "i" } },
        ];
      }

      if (dto.isActive !== undefined) {
        query.isActive = dto.isActive;
      }

      const totalCount = await this.salesTypeRepository.countSalesTypes(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const salesTypes = await this.salesTypeRepository.getSalesTypeList(query, validPage, limit);

      return {
        salesTypes,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
          hasNextPage: validPage < totalPages,
          hasPrevPage: validPage > 1,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.SalesTypeUseCase, this.logger);
    }
  }
}
