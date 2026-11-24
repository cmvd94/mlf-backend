import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { ItemGroupRepository } from "@/infrastructure/repositories/admin/ItemGroupRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { HsnCodeRepository } from "@/infrastructure/repositories/admin/HsnCodeRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreateItemDTO, UpdateItemDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class CreateItemUseCase {
  constructor(
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateItemDTO, reqAdmin: ReqAdminDTO) {
    try {
      // Validate ItemGroup if provided
      if (dto.itemGroupId) {
        const itemGroup = await this.itemGroupRepository.getItemGroupById(dto.itemGroupId);
        if (!itemGroup) {
          throw new HttpException(404, ERROR_MESSAGES.ITEM_GROUP_NOT_FOUND, ERROR_CODES.ITEM_GROUP_NOT_FOUND);
        }
      }

      // Validate UOM exists
      const uom = await this.uomRepository.getUomById(dto.defaultUomId);
      if (!uom) {
        throw new HttpException(404, ERROR_MESSAGES.UOM_NOT_FOUND, ERROR_CODES.UOM_NOT_FOUND);
      }

      // Validate PerUnit exists
      const perUnit = await this.perUnitRepository.getPerUnitById(dto.defaultPerId);
      if (!perUnit) {
        throw new HttpException(404, ERROR_MESSAGES.PER_UNIT_NOT_FOUND, ERROR_CODES.PER_UNIT_NOT_FOUND);
      }

      // Validate HSN Code if provided
      let resolvedHsnCode = dto.hsnCode?.trim() || "";
      let resolvedHsnCodeId: any = undefined;
      if (dto.hsnCodeId) {
        const hsnDoc = await this.hsnCodeRepository.getHsnCodeById(dto.hsnCodeId);
        if (!hsnDoc) {
          throw new HttpException(404, ERROR_MESSAGES.HSN_CODE_NOT_FOUND, ERROR_CODES.HSN_CODE_NOT_FOUND);
        }
        resolvedHsnCodeId = generateObjectId(dto.hsnCodeId);
        if (!resolvedHsnCode) {
          resolvedHsnCode = hsnDoc.hsnCode;
        }
      }

      let finalItemCode = dto.itemCode;
      if (!finalItemCode) {
        const seq = await this.counterRepository.getNextSequence("ITEM_CODE", this.logger);
        finalItemCode = `ITM_${seq.toString().padStart(3, "0")}`;
      }

      const itemId = await this.itemRepository.createItem({
        itemCode: finalItemCode,
        name: dto.name.trim(),
        itemGroupId: dto.itemGroupId ? (generateObjectId(dto.itemGroupId) as any) : undefined,
        description: dto.description?.trim() || "",
        defaultUomId: generateObjectId(dto.defaultUomId) as any,
        defaultPerId: generateObjectId(dto.defaultPerId) as any,
        hsnCodeId: resolvedHsnCodeId,
        hsnCode: resolvedHsnCode,
        standardRate: dto.standardRate !== undefined ? Number(dto.standardRate) : 0,
        currentStock: dto.openingStock !== undefined ? Number(dto.openingStock) : 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.itemRepository.getItemById(itemId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdateItemUseCase {
  constructor(
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateItemDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };

      if (dto.itemGroupId !== undefined) {
        if (dto.itemGroupId) {
          const itemGroup = await this.itemGroupRepository.getItemGroupById(dto.itemGroupId);
          if (!itemGroup) {
            throw new HttpException(404, ERROR_MESSAGES.ITEM_GROUP_NOT_FOUND, ERROR_CODES.ITEM_GROUP_NOT_FOUND);
          }
          updateData.itemGroupId = generateObjectId(dto.itemGroupId);
        } else {
          updateData.itemGroupId = null;
        }
      }

      if (dto.defaultUomId) {
        const uom = await this.uomRepository.getUomById(dto.defaultUomId);
        if (!uom) {
          throw new HttpException(404, ERROR_MESSAGES.UOM_NOT_FOUND, ERROR_CODES.UOM_NOT_FOUND);
        }
        updateData.defaultUomId = generateObjectId(dto.defaultUomId);
      }

      if (dto.defaultPerId) {
        const perUnit = await this.perUnitRepository.getPerUnitById(dto.defaultPerId);
        if (!perUnit) {
          throw new HttpException(404, ERROR_MESSAGES.PER_UNIT_NOT_FOUND, ERROR_CODES.PER_UNIT_NOT_FOUND);
        }
        updateData.defaultPerId = generateObjectId(dto.defaultPerId);
      }

      if (dto.hsnCodeId !== undefined) {
        if (dto.hsnCodeId) {
          const hsnDoc = await this.hsnCodeRepository.getHsnCodeById(dto.hsnCodeId);
          if (!hsnDoc) {
            throw new HttpException(404, ERROR_MESSAGES.HSN_CODE_NOT_FOUND, ERROR_CODES.HSN_CODE_NOT_FOUND);
          }
          updateData.hsnCodeId = generateObjectId(dto.hsnCodeId);
          updateData.hsnCode = dto.hsnCode?.trim() || hsnDoc.hsnCode;
        } else {
          updateData.hsnCodeId = null;
          updateData.hsnCode = "";
        }
      } else if (dto.hsnCode !== undefined) {
        updateData.hsnCode = dto.hsnCode.trim();
      }

      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.itemCode !== undefined) updateData.itemCode = dto.itemCode.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.standardRate !== undefined) updateData.standardRate = Number(dto.standardRate);
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      await this.itemRepository.updateItem(id, updateData);
      return await this.itemRepository.getItemById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemUseCase, this.logger);
    }
  }
}

@injectable()
export class DeleteItemUseCase {
  constructor(
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.itemRepository.deleteItem(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemUseCase, this.logger);
    }
  }
}

@injectable()
export class GetItemListUseCase {
  constructor(
    @inject(ItemRepository) private itemRepository: ItemRepository,
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
          { itemCode: { $regex: dto.search.trim(), $options: "i" } },
        ];
      }

      if (dto.isActive !== undefined) {
        query.isActive = dto.isActive;
      }

      const totalCount = await this.itemRepository.countItems(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const items = await this.itemRepository.getItemList(query, validPage, limit);

      return {
        items,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.ItemUseCase, this.logger);
    }
  }
}
