import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { CreatePurchaseTypeDTO, UpdatePurchaseTypeDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreatePurchaseTypeUseCase {
  constructor(
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreatePurchaseTypeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const typeId = await this.purchaseTypeRepository.createPurchaseType({
        name: dto.name.trim(),
        code: dto.code?.trim() || dto.name.trim().toUpperCase().replace(/\s+/g, "_"),
        description: dto.description?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.purchaseTypeRepository.getPurchaseTypeById(typeId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdatePurchaseTypeUseCase {
  constructor(
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdatePurchaseTypeDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.code !== undefined) updateData.code = dto.code.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.purchaseTypeRepository.updatePurchaseType(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class DeletePurchaseTypeUseCase {
  constructor(
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.purchaseTypeRepository.deletePurchaseType(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseTypeUseCase, this.logger);
    }
  }
}

@injectable()
export class GetPurchaseTypeListUseCase {
  constructor(
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
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

      const totalCount = await this.purchaseTypeRepository.countPurchaseTypes(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const purchaseTypes = await this.purchaseTypeRepository.getPurchaseTypeList(query, validPage, limit);

      return {
        purchaseTypes,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseTypeUseCase, this.logger);
    }
  }
}
