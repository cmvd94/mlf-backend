import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { ItemGroupRepository } from "@/infrastructure/repositories/admin/ItemGroupRepository";
import { CreateItemGroupDTO, UpdateItemGroupDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreateItemGroupUseCase {
  constructor(
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateItemGroupDTO, reqAdmin: ReqAdminDTO) {
    try {
      const groupId = await this.itemGroupRepository.createItemGroup({
        name: dto.name.trim(),
        code: dto.code?.trim() || dto.name.trim().toUpperCase().replace(/\s+/g, "_"),
        description: dto.description?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.itemGroupRepository.getItemGroupById(groupId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemGroupUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdateItemGroupUseCase {
  constructor(
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateItemGroupDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.code !== undefined) updateData.code = dto.code.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.itemGroupRepository.updateItemGroup(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemGroupUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteItemGroupUseCase {
  constructor(
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.itemGroupRepository.deleteItemGroup(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemGroupUseCase, this.logger);
    }
  }
}

@injectable()
export class GetItemGroupListUseCase {
  constructor(
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
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

      const totalCount = await this.itemGroupRepository.countItemGroups(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const itemGroups = await this.itemGroupRepository.getItemGroupList(query, validPage, limit);

      return {
        itemGroups,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemGroupUseCase, this.logger);
    }
  }
}
