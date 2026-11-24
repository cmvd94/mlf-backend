import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { HsnCodeRepository } from "@/infrastructure/repositories/admin/HsnCodeRepository";
import { CreateHsnCodeDTO, UpdateHsnCodeDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreateHsnCodeUseCase {
  constructor(
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateHsnCodeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const hsnId = await this.hsnCodeRepository.createHsnCode({
        hsnCode: dto.hsnCode.trim(),
        description: dto.description?.trim() || "",
        gstRate: dto.gstRate !== undefined ? Number(dto.gstRate) : 5,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.hsnCodeRepository.getHsnCodeById(hsnId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.HsnCodeUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdateHsnCodeUseCase {
  constructor(
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateHsnCodeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.hsnCode !== undefined) updateData.hsnCode = dto.hsnCode.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.gstRate !== undefined) updateData.gstRate = Number(dto.gstRate);
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.hsnCodeRepository.updateHsnCode(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.HsnCodeUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteHsnCodeUseCase {
  constructor(
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.hsnCodeRepository.deleteHsnCode(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.HsnCodeUseCase, this.logger);
    }
  }
}

@injectable()
export class GetHsnCodeListUseCase {
  constructor(
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: InventoryQueryDTO) {
    try {
      const page = Number(dto.page) || 1;
      const limit = Number(dto.limit) || 20;
      const query: any = {};

      if (dto.search) {
        query.$or = [
          { hsnCode: { $regex: dto.search.trim(), $options: "i" } },
          { description: { $regex: dto.search.trim(), $options: "i" } },
        ];
      }

      if (dto.isActive !== undefined) {
        query.isActive = dto.isActive;
      }

      const totalCount = await this.hsnCodeRepository.countHsnCodes(query);
      const hsnCodes = await this.hsnCodeRepository.getHsnCodeList(query, page, limit);

      return {
        hsnCodes,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        currentPage: page,
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.HsnCodeUseCase, this.logger);
    }
  }
}
