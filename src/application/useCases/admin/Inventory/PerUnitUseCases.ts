import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { CreatePerUnitDTO, UpdatePerUnitDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreatePerUnitUseCase {
  constructor(
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreatePerUnitDTO, reqAdmin: ReqAdminDTO) {
    try {
      const perUnitId = await this.perUnitRepository.createPerUnit({
        name: dto.name.trim(),
        symbol: dto.symbol.trim(),
        multiplier: dto.multiplier !== undefined ? Number(dto.multiplier) : 1,
        description: dto.description?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.perUnitRepository.getPerUnitById(perUnitId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PerUnitUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdatePerUnitUseCase {
  constructor(
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdatePerUnitDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.symbol !== undefined) updateData.symbol = dto.symbol.trim();
      if (dto.multiplier !== undefined) updateData.multiplier = Number(dto.multiplier);
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.perUnitRepository.updatePerUnit(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PerUnitUseCase, this.logger);
    }
  }
}

@injectable()
export class DeletePerUnitUseCase {
  constructor(
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.perUnitRepository.deletePerUnit(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PerUnitUseCase, this.logger);
    }
  }
}

@injectable()
export class GetPerUnitListUseCase {
  constructor(
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
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
          { symbol: { $regex: dto.search.trim(), $options: "i" } },
        ];
      }

      if (dto.isActive !== undefined) {
        query.isActive = dto.isActive;
      }

      const totalCount = await this.perUnitRepository.countPerUnits(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const perUnits = await this.perUnitRepository.getPerUnitList(query, validPage, limit);

      return {
        perUnits,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PerUnitUseCase, this.logger);
    }
  }
}
