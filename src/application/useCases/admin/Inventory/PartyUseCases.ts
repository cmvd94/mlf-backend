import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreatePartyDTO, UpdatePartyDTO, InventoryQueryDTO } from "@/shared/dto/admin/inventoryDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class CreatePartyUseCase {
  constructor(
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreatePartyDTO, reqAdmin: ReqAdminDTO) {
    try {
      let finalPartyCode = dto.partyCode;
      if (!finalPartyCode) {
        const seq = await this.counterRepository.getNextSequence("PARTY_CODE", this.logger);
        finalPartyCode = `PRT_${seq.toString().padStart(3, "0")}`;
      }

      const partyId = await this.partyRepository.createParty({
        partyCode: finalPartyCode,
        name: dto.name.trim(),
        contactPerson: dto.contactPerson?.trim() || "",
        phoneNumber: dto.phoneNumber?.trim() || "",
        email: dto.email?.trim() || "",
        address: dto.address?.trim() || "",
        gstin: dto.gstin?.trim() || "",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: generateObjectId(reqAdmin.userId),
      });

      return await this.partyRepository.getPartyById(partyId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PartyUseCase, this.logger);
    }
  }
}

@injectable()
export class UpdatePartyUseCase {
  constructor(
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdatePartyDTO, reqAdmin: ReqAdminDTO) {
    try {
      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.partyCode !== undefined) updateData.partyCode = dto.partyCode.trim();
      if (dto.contactPerson !== undefined) updateData.contactPerson = dto.contactPerson.trim();
      if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber.trim();
      if (dto.email !== undefined) updateData.email = dto.email.trim();
      if (dto.address !== undefined) updateData.address = dto.address.trim();
      if (dto.gstin !== undefined) updateData.gstin = dto.gstin.trim();
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.partyRepository.updateParty(id, updateData);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PartyUseCase, this.logger);
    }
  }
}

@injectable()
export class DeletePartyUseCase {
  constructor(
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, reqAdmin: ReqAdminDTO) {
    try {
      return await this.partyRepository.deleteParty(id, reqAdmin.userId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PartyUseCase, this.logger);
    }
  }
}

@injectable()
export class GetPartyListUseCase {
  constructor(
    @inject(PartyRepository) private partyRepository: PartyRepository,
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
          { partyCode: { $regex: dto.search.trim(), $options: "i" } },
          { phoneNumber: { $regex: dto.search.trim(), $options: "i" } },
        ];
      }

      if (dto.isActive !== undefined) {
        query.isActive = dto.isActive;
      }

      const totalCount = await this.partyRepository.countParties(query);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.min(page, totalPages);
      const parties = await this.partyRepository.getPartyList(query, validPage, limit);

      return {
        parties,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalCount,
          limit,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PartyUseCase, this.logger);
    }
  }
}
