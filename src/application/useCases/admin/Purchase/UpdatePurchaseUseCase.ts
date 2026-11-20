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
import { parseVoucherDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { FINANCIAL_CONFIG } from "@/shared/constants/financialConfig";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
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
        updateData.date = parseVoucherDate(dto.date);
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes.trim();
      }

      // 5. If items are being updated, reconcile stock and calculate amounts
      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        const calculatedItems: any[] = [];
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
            batchNo: itemDto.batchNo?.trim() || "",
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

        // Reconcile and update GodownStock docs in-place instead of deleting & recreating
        const existingStockDocs = await this.godownStockRepository.findByPurchaseId(existingPurchase._id);
        const usedStockDocIds = new Set<string>();

        // If legacy purchase had no GodownStock documents, revert previous item stock
        if (existingStockDocs.length === 0) {
          if (existingPurchase.items && existingPurchase.items.length > 0) {
            for (const oldIt of existingPurchase.items) {
              const oldItemId = (oldIt.itemId as any)?._id || oldIt.itemId;
              await this.itemRepository.adjustStockQuantity(
                oldItemId.toString(),
                -Number(oldIt.actualQuantity)
              );
            }
          } else if (existingPurchase.itemId) {
            const oldItemId = (existingPurchase.itemId as any)?._id || existingPurchase.itemId;
            await this.itemRepository.adjustStockQuantity(
              oldItemId.toString(),
              -Number(existingPurchase.actualQuantity)
            );
          }
        }

        for (let i = 0; i < calculatedItems.length; i++) {
          const newIt = calculatedItems[i];
          const rawItemDto = dto.items[i];

          // Match corresponding existing GodownStock doc
          let matchedStockDoc: any = null;

          // 1. Match by explicit godownStockId
          if (rawItemDto?.godownStockId) {
            matchedStockDoc = existingStockDocs.find(
              (doc) => doc._id.toString() === rawItemDto.godownStockId && !usedStockDocIds.has(doc._id.toString())
            );
          }

          // 2. Match by existing item's godownStockId reference
          if (!matchedStockDoc && existingPurchase.items && existingPurchase.items[i]) {
            const oldItem = existingPurchase.items[i];
            const oldStockId = (oldItem as any).godownStockId?.toString();
            if (oldStockId) {
              matchedStockDoc = existingStockDocs.find(
                (doc) => doc._id.toString() === oldStockId && !usedStockDocIds.has(doc._id.toString())
              );
            }
          }

          // 3. Match by position index in existingStockDocs
          if (!matchedStockDoc && i < existingStockDocs.length) {
            if (!usedStockDocIds.has(existingStockDocs[i]._id.toString())) {
              matchedStockDoc = existingStockDocs[i];
            }
          }

          // 4. Fallback for legacy single item purchase: match root existingPurchase.godownStockId
          if (!matchedStockDoc && (existingPurchase as any).godownStockId) {
            const rootStockId = (existingPurchase as any).godownStockId.toString();
            matchedStockDoc = existingStockDocs.find(
              (doc) => doc._id.toString() === rootStockId && !usedStockDocIds.has(doc._id.toString())
            );
          }

          if (matchedStockDoc) {
            usedStockDocIds.add(matchedStockDoc._id.toString());

            const oldActualQty = Number(
              matchedStockDoc.initialStock !== undefined
                ? matchedStockDoc.initialStock
                : matchedStockDoc.currentStock
            ) || 0;
            const newActualQty = Number(newIt.actualQuantity) || 0;
            const qtyDelta = newActualQty - oldActualQty;

            // Prevent reduction below transferred/consumed stock
            if (matchedStockDoc.currentStock + qtyDelta < 0) {
              throw new HttpException(
                400,
                `Cannot reduce purchase quantity for batch "${newIt.batchNo || matchedStockDoc.batchNo}" below already transferred or consumed stock. Current remaining: ${matchedStockDoc.currentStock}, reduction requested: ${Math.abs(qtyDelta)}`,
                ERROR_CODES.INSUFFICIENT_STOCK
              );
            }

            (newIt as any)._matchedStockDoc = matchedStockDoc;
            (newIt as any)._qtyDelta = qtyDelta;
            (newIt as any)._oldActualQty = oldActualQty;
            (newIt as any).godownStockId = matchedStockDoc._id;
          }
        }

        // Verify if any removed batch cannot be deleted because stock was transferred
        for (const unusedDoc of existingStockDocs) {
          if (!usedStockDocIds.has(unusedDoc._id.toString())) {
            const initialQty = Number(
              unusedDoc.initialStock !== undefined ? unusedDoc.initialStock : unusedDoc.currentStock
            ) || 0;
            if (unusedDoc.currentStock < initialQty) {
              throw new HttpException(
                400,
                `Cannot remove item batch "${unusedDoc.batchNo}" from purchase because stock has already been transferred or consumed.`,
                ERROR_CODES.INSUFFICIENT_STOCK
              );
            }
          }
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
        updateData.batchNo = calculatedItems[0].batchNo;
        updateData.uomId = calculatedItems[0].uomId;
        updateData.uomQuantity = calculatedItems[0].uomQuantity;
        updateData.actualQuantity = calculatedItems[0].actualQuantity;
        updateData.billedQuantity = calculatedItems[0].billedQuantity;
        updateData.rate = calculatedItems[0].rate;
        updateData.perId = calculatedItems[0].perId;
        updateData.amount = totalAmount;
        updateData.godownStockId = (calculatedItems[0] as any).godownStockId;

        // Atomically reconcile stock batches and update purchase in database
        await withTransaction(async (session: ClientSession) => {
          // If legacy purchase had no GodownStock documents, revert previous item stock
          if (existingStockDocs.length === 0) {
            if (existingPurchase.items && existingPurchase.items.length > 0) {
              for (const oldIt of existingPurchase.items) {
                const oldItemId = (oldIt.itemId as any)?._id || oldIt.itemId;
                await this.itemRepository.adjustStockQuantity(
                  oldItemId.toString(),
                  -Number(oldIt.actualQuantity),
                  session
                );
              }
            } else if (existingPurchase.itemId) {
              const oldItemId = (existingPurchase.itemId as any)?._id || existingPurchase.itemId;
              await this.itemRepository.adjustStockQuantity(
                oldItemId.toString(),
                -Number(existingPurchase.actualQuantity),
                session
              );
            }
          }

          for (let i = 0; i < calculatedItems.length; i++) {
            const newIt = calculatedItems[i];
            const matchedStockDoc = (newIt as any)._matchedStockDoc;
            const qtyDelta = (newIt as any)._qtyDelta;
            const oldActualQty = (newIt as any)._oldActualQty;

            if (matchedStockDoc) {
              const oldItemId = (matchedStockDoc.itemId?._id || matchedStockDoc.itemId).toString();
              const newItemId = newIt.itemId.toString();

              if (oldItemId === newItemId) {
                if (qtyDelta !== 0) {
                  await this.itemRepository.adjustStockQuantity(newItemId, qtyDelta, session);
                }
              } else {
                // Item changed: revert old item stock and add new item stock
                await this.itemRepository.adjustStockQuantity(oldItemId, -oldActualQty, session);
                await this.itemRepository.adjustStockQuantity(newItemId, newIt.actualQuantity, session);
              }

              // Update existing stock doc in-place without creating a new document
              await this.godownStockRepository.updateBatchStock(
                matchedStockDoc._id,
                {
                  godownId: newIt.godownId,
                  itemId: newIt.itemId,
                  batchNo: newIt.batchNo,
                  currentStock: Number(matchedStockDoc.currentStock + qtyDelta),
                  initialStock: newIt.actualQuantity,
                  uomId: newIt.uomId,
                  uomQuantity: newIt.uomQuantity,
                  perId: newIt.perId,
                  updatedBy: reqAdmin.userId,
                  isDeleted: false,
                },
                session
              );
            } else {
              // New item row: create new GodownStock doc
              const stockDoc = await this.godownStockRepository.createBatchStock(
                {
                  godownId: newIt.godownId,
                  itemId: newIt.itemId,
                  batchNo: newIt.batchNo,
                  currentStock: newIt.actualQuantity,
                  initialStock: newIt.actualQuantity,
                  uomId: newIt.uomId,
                  uomQuantity: newIt.uomQuantity,
                  perId: newIt.perId,
                  purchaseId: existingPurchase._id,
                  sourceType: "PURCHASE",
                  createdBy: reqAdmin.userId,
                  updatedBy: reqAdmin.userId,
                },
                session
              );

              (newIt as any).godownStockId = stockDoc._id;

              await this.itemRepository.adjustStockQuantity(
                newIt.itemId.toString(),
                newIt.actualQuantity,
                session
              );
            }

            delete (newIt as any)._matchedStockDoc;
            delete (newIt as any)._qtyDelta;
            delete (newIt as any)._oldActualQty;
          }

          // Handle removed rows: soft-delete unused GodownStock docs and revert aggregate stock
          for (const unusedDoc of existingStockDocs) {
            if (!usedStockDocIds.has(unusedDoc._id.toString())) {
              const initialQty = Number(
                unusedDoc.initialStock !== undefined ? unusedDoc.initialStock : unusedDoc.currentStock
              ) || 0;

              await this.godownStockRepository.updateBatchStock(
                unusedDoc._id,
                {
                  currentStock: 0,
                  isDeleted: true,
                  updatedBy: reqAdmin.userId,
                },
                session
              );

              const oldItemId = (unusedDoc.itemId?._id || unusedDoc.itemId).toString();
              await this.itemRepository.adjustStockQuantity(oldItemId, -initialQty, session);
            }
          }

          // Update purchase record in database
          await this.purchaseRepository.updatePurchase(id, updateData, session);
        });
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

        await this.purchaseRepository.updatePurchase(id, updateData);
      } else {
        await this.purchaseRepository.updatePurchase(id, updateData);
      }

      // 7. Return refreshed populated purchase
      return await this.purchaseRepository.getPurchaseById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.PurchaseUseCase, this.logger);
    }
  }
}
