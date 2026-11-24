import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { SalesTypeRepository } from "@/infrastructure/repositories/admin/SalesTypeRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { ItemGroupRepository } from "@/infrastructure/repositories/admin/ItemGroupRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { HsnCodeRepository } from "@/infrastructure/repositories/admin/HsnCodeRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { SuperAdmin } from "@/shared/constants/adminRole";
import { generateGodownQuery } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";

@injectable()
export class GetMastersUseCase {
  constructor(
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject(SalesTypeRepository) private salesTypeRepository: SalesTypeRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(ItemGroupRepository) private itemGroupRepository: ItemGroupRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(HsnCodeRepository) private hsnCodeRepository: HsnCodeRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(reqAdmin?: ReqAdminDTO) {
    try {
      let accessibleGodownsQuery: any = { isActive: true };
      if (reqAdmin && reqAdmin.role !== SuperAdmin.SUPER_ADMIN) {
        const { query, hasAccess } = generateGodownQuery({ isActive: true }, reqAdmin);
        accessibleGodownsQuery = hasAccess ? query : null;
      }

      const [parties, purchaseTypes, salesTypes, uoms, perUnits, itemGroups, items, godowns, hsnCodes] = await Promise.all([
        this.partyRepository.getAllActiveParties(),
        this.purchaseTypeRepository.getAllActivePurchaseTypes(),
        this.salesTypeRepository.getAllActiveSalesTypes(),
        this.uomRepository.getAllActiveUoms(),
        this.perUnitRepository.getAllActivePerUnits(),
        this.itemGroupRepository.getAllActiveItemGroups(),
        this.itemRepository.getAllActiveItems(),
        accessibleGodownsQuery
          ? this.godownRepository.getAllGodownsByQuery(accessibleGodownsQuery)
          : Promise.resolve([]),
        this.hsnCodeRepository.getAllActiveHsnCodes(),
      ]);

      return {
        parties,
        purchaseTypes,
        salesTypes,
        uoms,
        perUnits,
        itemGroups,
        items,
        godowns,
        hsnCodes,
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.AccountInventoryController, this.logger);
    }
  }
}
