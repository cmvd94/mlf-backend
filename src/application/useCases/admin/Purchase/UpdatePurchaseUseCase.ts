import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { PurchaseRepository } from "@/infrastructure/repositories/admin/PurchaseRepository";
import { PartyRepository } from "@/infrastructure/repositories/admin/PartyRepository";
import { PurchaseTypeRepository } from "@/infrastructure/repositories/admin/PurchaseTypeRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { UpdatePurchaseDTO } from "@/shared/dto/admin/purchaseDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { FINANCIAL_CONFIG } from "@/shared/constants/financialConfig";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class UpdatePurchaseUseCase {
  constructor(
    @inject(PurchaseRepository) private purchaseRepository: PurchaseRepository,
    @inject(PartyRepository) private partyRepository: PartyRepository,
    @inject(PurchaseTypeRepository) private purchaseTypeRepository: PurchaseTypeRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdatePurchaseDTO, reqAdmin: ReqAdminDTO) {
    try {
      // 1. Fetch existing purchase
      const existingPurchase: any = await this.purchaseRepository.getPurchaseById(id);
      if (!existingPurchase) {
        throw new HttpException(404, ERROR_MESSAGES.PURCHASE_NOT_FOUND, ERROR_CODES.PURCHASE_NOT_FOUND);
      }

      // 2. Validate admin hierarchy access for existing purchase's godowns
      if (existingPurchase.items && existingPurchase.items.length > 0) {
        for (const it of existingPurchase.items) {
          const itGodown = it.godownId;
          if (itGodown) {
            const hasAccess = compareAdminAndGodownLocation(reqAdmin, itGodown);
            if (!hasAccess) {
              throw new HttpException(
                403,
                ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
                ERROR_CODES.GODOWN_ACCESS_DENIED
              );
            }
          }
        }
      } else if (existingPurchase.godownId) {
        const hasAccess = compareAdminAndGodownLocation(reqAdmin, existingPurchase.godownId);
        if (!hasAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }
      }

      const updateData: any = {
        updatedBy: generateObjectId(reqAdmin.userId),
      };

      // 3. Verify party if updated
      if (dto.partyId) {
        const party = await this.partyRepository.getPartyById(dto.partyId);
        if (!party || !party.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PARTY_NOT_FOUND, ERROR_CODES.PARTY_NOT_FOUND);
        }
        updateData.partyId = generateObjectId(dto.partyId);
      }

      // 4. Verify purchase type if updated
      if (dto.purchaseTypeId) {
        const purchaseType = await this.purchaseTypeRepository.getPurchaseTypeById(dto.purchaseTypeId);
        if (!purchaseType || !purchaseType.isActive) {
          throw new HttpException(404, ERROR_MESSAGES.PURCHASE_TYPE_NOT_FOUND, ERROR_CODES.PURCHASE_TYPE_NOT_FOUND);
        }
        updateData.purchaseTypeId = generateObjectId(dto.purchaseTypeId);
      }

      if (dto.date) {
        updateData.date = new Date(dto.date);
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes.trim();
      }

      // 5. If items are being updated, reconcile stock and calculate amounts
      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        const calculatedItems = [];
        let subTotal = 0;
        let totalActualQuantity = 0;
        let totalBilledQuantity = 0;

        for (const itemDto of dto.items) {
          const targetGodownId = itemDto.godownId;
          if (!targetGodownId) {
            throw new HttpException(400, "Godown ID is required for each item", ERROR_CODES.VALIDATION_ERROR);
          }

          // Verify assigned delivered godown
          const godown = await this.godownRepository.findGodownById(targetGodownId);
          if (!godown || godown.isDeleted) {
            throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
          }
          if (!godown.isActive) {
            throw new HttpException(400, ERROR_MESSAGES.GODOWN_INACTIVE, ERROR_CODES.GODOWN_INACTIVE);
          }

          // Hierarchy access check
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, godown);
          if (!hasAccess) {
            throw new HttpException(
              403,
              ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
              ERROR_CODES.GODOWN_ACCESS_DENIED
            );
          }

          // Verify item
          const item = await this.itemRepository.getItemById(itemDto.itemId);
          if (!item || !item.isActive) {
            throw new HttpException(404, ERROR_MESSAGES.ITEM_NOT_FOUND, ERROR_CODES.ITEM_NOT_FOUND);
          }

          // Verify UOM
          const uom = await this.uomRepository.getUomById(itemDto.uomId);
          if (!uom || !uom.isActive) {
            throw new HttpException(404, ERROR_MESSAGES.UOM_NOT_FOUND, ERROR_CODES.UOM_NOT_FOUND);
          }

          // Verify PerUnit
          const perUnit = await this.perUnitRepository.getPerUnitById(itemDto.perId);
          if (!perUnit || !perUnit.isActive) {
            throw new HttpException(404, ERROR_MESSAGES.PER_UNIT_NOT_FOUND, ERROR_CODES.PER_UNIT_NOT_FOUND);
          }

          const multiplier = perUnit.multiplier && perUnit.multiplier > 0 ? perUnit.multiplier : 1;
          const itemAmount = Number(((itemDto.billedQuantity * itemDto.rate) / multiplier).toFixed(2));
          const actualQty = Number(itemDto.actualQuantity);
          const billedQty = Number(itemDto.billedQuantity);
          const uomQty = Number(itemDto.uomQuantity || actualQty || 1);

          subTotal += itemAmount;
          totalActualQuantity += actualQty;
          totalBilledQuantity += billedQty;

          calculatedItems.push({
            itemId: generateObjectId(itemDto.itemId) as any,
            godownId: generateObjectId(targetGodownId) as any,
            uomId: generateObjectId(itemDto.uomId) as any,
            uomQuantity: uomQty,
            actualQuantity: actualQty,
            billedQuantity: billedQty,
            rate: Number(itemDto.rate),
            perId: generateObjectId(itemDto.perId) as any,
            amount: itemAmount,
          });
        }

        subTotal = Number(subTotal.toFixed(2));

        // Revert previous stock
        if (existingPurchase.items && existingPurchase.items.length > 0) {
          for (const oldIt of existingPurchase.items) {
            const oldItemId = (oldIt.itemId as any)?._id || oldIt.itemId;
            const oldGodown = oldIt.godownId || existingPurchase.godownId;
            const oldGodownId = (oldGodown as any)?._id || oldGodown;

            if (oldGodownId) {
              await this.godownStockRepository.adjustStock(
                oldGodownId.toString(),
                oldItemId.toString(),
                -Number(oldIt.actualQuantity),
                reqAdmin.userId
              );
            }
            await this.itemRepository.adjustStockQuantity(
              oldItemId.toString(),
              -Number(oldIt.actualQuantity)
            );
          }
        } else if (existingPurchase.itemId) {
          const oldItemId = (existingPurchase.itemId as any)?._id || existingPurchase.itemId;
          const oldGodown = existingPurchase.godownId;
          const oldGodownId = (oldGodown as any)?._id || oldGodown;
          if (oldGodownId) {
            await this.godownStockRepository.adjustStock(
              oldGodownId.toString(),
              oldItemId.toString(),
              -Number(existingPurchase.actualQuantity),
              reqAdmin.userId
            );
          }
          await this.itemRepository.adjustStockQuantity(
            oldItemId.toString(),
            -Number(existingPurchase.actualQuantity)
          );
        }

        // Apply new stock
        for (const newIt of calculatedItems) {
          await this.godownStockRepository.adjustStock(
            newIt.godownId.toString(),
            newIt.itemId.toString(),
            newIt.actualQuantity,
            reqAdmin.userId
          );
          await this.itemRepository.adjustStockQuantity(
            newIt.itemId.toString(),
            newIt.actualQuantity
          );
        }

        // GST Calculation
        const isGstBill =
          dto.isGstBill !== undefined
            ? Boolean(dto.isGstBill)
            : Boolean(existingPurchase.isGstBill);

        let gstPercentage = 0;
        let gstAmount = 0;
        let totalAmount = subTotal;

        if (isGstBill) {
          gstPercentage =
            typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
              ? dto.gstPercentage
              : typeof existingPurchase.gstPercentage === "number" && existingPurchase.gstPercentage > 0
              ? existingPurchase.gstPercentage
              : FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
          gstAmount = Number(((subTotal * gstPercentage) / 100).toFixed(2));
          totalAmount = Number((subTotal + gstAmount).toFixed(2));
        }

        updateData.items = calculatedItems;
        updateData.subTotal = subTotal;
        updateData.isGstBill = isGstBill;
        updateData.gstPercentage = gstPercentage;
        updateData.gstAmount = gstAmount;
        updateData.totalAmount = totalAmount;
        updateData.totalActualQuantity = totalActualQuantity;
        updateData.totalBilledQuantity = totalBilledQuantity;

        // Update legacy mirror fields
        updateData.itemId = calculatedItems[0].itemId;
        updateData.uomId = calculatedItems[0].uomId;
        updateData.uomQuantity = calculatedItems[0].uomQuantity;
        updateData.actualQuantity = calculatedItems[0].actualQuantity;
        updateData.billedQuantity = calculatedItems[0].billedQuantity;
        updateData.rate = calculatedItems[0].rate;
        updateData.perId = calculatedItems[0].perId;
        updateData.amount = totalAmount;
      } else if (dto.isGstBill !== undefined || dto.gstPercentage !== undefined) {
        // Items not modified, but GST configuration updated
        const baseSubTotal =
          typeof existingPurchase.subTotal === "number" && existingPurchase.subTotal > 0
            ? existingPurchase.subTotal
            : Number(existingPurchase.totalAmount || 0);

        const isGstBill =
          dto.isGstBill !== undefined
            ? Boolean(dto.isGstBill)
            : Boolean(existingPurchase.isGstBill);

        let gstPercentage = 0;
        let gstAmount = 0;
        let totalAmount = baseSubTotal;

        if (isGstBill) {
          gstPercentage =
            typeof dto.gstPercentage === "number" && dto.gstPercentage >= 0
              ? dto.gstPercentage
              : typeof existingPurchase.gstPercentage === "number" && existingPurchase.gstPercentage > 0
              ? existingPurchase.gstPercentage
              : FINANCIAL_CONFIG.DEFAULT_GST_PERCENT;
          gstAmount = Number(((baseSubTotal * gstPercentage) / 100).toFixed(2));
          totalAmount = Number((baseSubTotal + gstAmount).toFixed(2));
        }

        updateData.subTotal = baseSubTotal;
        updateData.isGstBill = isGstBill;
        updateData.gstPercentage = gstPercentage;
        updateData.gstAmount = gstAmount;
        updateData.totalAmount = totalAmount;
      }

      // 6. Update database record
      await this.purchaseRepository.updatePurchase(id, updateData);

      // 7. Return refreshed populated purchase
      return await this.purchaseRepository.getPurchaseById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
