import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { CreateUomDTO, UpdateUomDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreateUomUseCase {
  constructor(
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateUomDTO, reqAdmin: ReqAdminDTO) {
    try {
      const uomId = await this.uomRepository.createUom({
        name: dto.name.trim(),
        symbol: dto.symbol.trim().toUpperCase(),
        description: dto.description?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.uomRepository.getUomById(uomId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.UomUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdateUomUseCase {
  constructor(
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateUomDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.symbol !== undefined) updateData.symbol = dto.symbol.trim().toUpperCase();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.uomRepository.updateUom(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.UomUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteUomUseCase {
  constructor(
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.uomRepository.deleteUom(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.UomUseCase, this.logger);
    }
  }
}

@injectable()
export class GetUomListUseCase {
  constructor(
    @inject(UomRepository) private uomRepository: UomRepository,
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

      const totalCount = await this.uomRepository.countUoms(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const uoms = await this.uomRepository.getUomList(query, validPage, limit);

      return {
        uoms,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.UomUseCase, this.logger);
    }
  }
}
