import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockSummaryRepository } from "@/infrastructure/repositories/admin/StockSummaryRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import {
  GetStockSummaryQueryDTO,
  StockSummaryResponseDTO,
  StockSummaryGroupDTO,
  StockSummaryItemDTO,
  StockSummaryBatchDTO,
} from "@/shared/dto/admin/stockSummaryDTO";
import { generateGodownQuery, compareAdminAndGodownLocation } from "@/shared/utils/godownQueryHelper";
import { formatIndianCurrency, formatQuantity, formatRate, formatDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class GetStockSummaryUseCase {
  constructor(
    @inject(StockSummaryRepository) private stockSummaryRepository: StockSummaryRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: GetStockSummaryQueryDTO, reqAdmin: ReqAdminDTO): Promise<StockSummaryResponseDTO> {
    try {
      // 1. Regional and hierarchy access scope check
      const { query: godownQuery, hasAccess } = generateGodownQuery({}, reqAdmin);
      if (!hasAccess) {
        throw new HttpException(
          403,
          ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
          ERROR_CODES.GODOWN_ACCESS_DENIED
        );
      }

      const accessibleGodowns = await this.godownRepository.getAllGodownsByQuery(godownQuery);
      const accessibleGodownMap = new Map<string, any>();
      for (const g of accessibleGodowns) {
        accessibleGodownMap.set(g._id.toString(), g);
      }

      let targetGodownIds: string[] = Array.from(accessibleGodownMap.keys());
      let selectedGodownName: string | undefined = undefined;

      if (dto.godownId && dto.godownId.trim().length > 0) {
        const singleGodown = await this.godownRepository.findGodownById(dto.godownId.trim());
        if (!singleGodown || singleGodown.isDeleted) {
          throw new HttpException(404, ERROR_MESSAGES.GODOWN_NOT_FOUND, ERROR_CODES.GODOWN_NOT_FOUND);
        }

        const canAccess = compareAdminAndGodownLocation(reqAdmin, singleGodown);
        if (!canAccess) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.GODOWN_ACCESS_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }

        targetGodownIds = [singleGodown._id.toString()];
        selectedGodownName = singleGodown.name;
        accessibleGodownMap.set(singleGodown._id.toString(), singleGodown);
      }

      // If user has access to no godowns, return empty structure
      if (targetGodownIds.length === 0) {
        return this.buildEmptyResponse(selectedGodownName, dto.godownId);
      }

      // 2. Date parsing & period formatting
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (dto.fromDate) {
        fromDate = new Date(dto.fromDate);
        fromDate.setHours(0, 0, 0, 0);
      }
      if (dto.toDate) {
        toDate = new Date(dto.toDate);
        toDate.setHours(23, 59, 59, 999);
      }

      const formattedPeriod = this.getFormattedPeriod(fromDate, toDate);

      // 3. Load items and item groups
      const allItems = await this.stockSummaryRepository.getAllActiveItems({
        groupId: dto.groupId,
        search: dto.search,
      });

      const itemMap = new Map<string, any>();
      const itemIds: string[] = [];
      for (const item of allItems) {
        const idStr = item._id.toString();
        itemMap.set(idStr, item);
        itemIds.push(idStr);
      }

      // 4. Fetch purchase batch transactions
      const purchaseBatches = await this.stockSummaryRepository.getPurchaseBatchStocks(targetGodownIds, {
        fromDate,
        toDate,
        itemIds,
      });

      // 5. Fetch godown stock for baseline stock reconciliation
      const godownStocks = await this.stockSummaryRepository.getGodownStocks(targetGodownIds, itemIds);

      // Group batch stocks by Item ID
      const itemBatchLinesMap = new Map<string, Map<string, {
        dcNo: string;
        lotNo: string;
        batchNo?: string;
        godownId: string;
        uomQuantity?: number;
        quantity: number;
        value: number;
        rate: number;
        date?: string;
        formattedDate: string;
      }>>();

      const batchRateMap = new Map<string, number>();

      for (const pb of purchaseBatches) {
        if (!itemBatchLinesMap.has(pb.itemId)) {
          itemBatchLinesMap.set(pb.itemId, new Map());
        }
        const batchKey = `${pb.godownId}_${pb.dcNo}_${pb.lotNo}`;
        const existing = itemBatchLinesMap.get(pb.itemId)!.get(batchKey);
        const pbDateStr = pb.date ? pb.date.toISOString() : undefined;
        const pbFormattedDate = formatDate(pb.date);
        if (existing) {
          existing.quantity += pb.quantity;
          existing.uomQuantity = (existing.uomQuantity || 0) + (pb.uomQuantity || 0);
          existing.value += pb.value;
          existing.rate = existing.quantity > 0 ? Number((existing.value / existing.quantity).toFixed(2)) : pb.rate;
        } else {
          itemBatchLinesMap.get(pb.itemId)!.set(batchKey, {
            dcNo: pb.dcNo,
            lotNo: pb.lotNo,
            batchNo: pb.dcNo,
            godownId: pb.godownId,
            uomQuantity: pb.uomQuantity || 0,
            quantity: pb.quantity,
            value: pb.value,
            rate: pb.rate,
            date: pbDateStr,
            formattedDate: pbFormattedDate,
          });
        }

        if (pb.dcNo) {
          batchRateMap.set(`${pb.itemId}_${pb.dcNo}`, pb.rate);
          batchRateMap.set(pb.dcNo, pb.rate);
        }
      }

      const showZero = Boolean(dto.showZeroStock);

      // Reconcile items with live GodownStock documents (incorporating batch transfers & current balances)
      for (const gs of godownStocks) {
        const iId = (gs.itemId?._id || gs.itemId).toString();
        const gId = (gs.godownId?._id || gs.godownId).toString();
        const itemDoc = itemMap.get(iId);
        if (!itemDoc) continue;

        if (!itemBatchLinesMap.has(iId)) {
          itemBatchLinesMap.set(iId, new Map());
        }

        const batchesForThisItem = itemBatchLinesMap.get(iId)!;
        const dcNo = (gs.dcNo || (gs as any).batchNo || "").trim();
        const lotNo = (gs.lotNo || "").trim();
        const batchKey = (gs as any)._id ? (gs as any)._id.toString() : `${gId}_${dcNo}_${lotNo}`;

        // Determine unit rate for this batch
        let rate = Number((gs as any).rate) || 0;
        if (rate <= 0) {
          rate = batchRateMap.get(`${iId}_${dcNo}`) || batchRateMap.get(dcNo) || 0;
        }
        if (rate <= 0 && (gs as any).stockTransferId) {
          const transfer = (gs as any).stockTransferId;
          if (transfer.destinationItems) {
            const dItem = transfer.destinationItems.find((it: any) =>
              (it.dcNo && it.dcNo.trim() === dcNo) || (it.batchNo && it.batchNo.trim() === dcNo) || (it.itemId && it.itemId.toString() === iId)
            );
            if (dItem && Number(dItem.rate) > 0) rate = Number(dItem.rate);
          }
          if (rate <= 0 && transfer.sourceItems && transfer.sourceItems.length > 0) {
            for (const sItem of transfer.sourceItems) {
              const sDc = (sItem.dcNo || sItem.batchNo || "").trim();
              const sRate = batchRateMap.get(sDc) || Number(sItem.rate) || 0;
              if (sRate > 0) {
                rate = sRate;
                break;
              }
            }
          }
        }
        if (rate <= 0 && (gs as any).purchaseId?.items) {
          const pItem = (gs as any).purchaseId.items.find((it: any) =>
            (it.dcNo && it.dcNo.trim() === dcNo) || (it.batchNo && it.batchNo.trim() === dcNo) || (it.itemId && it.itemId.toString() === iId)
          );
          if (pItem) rate = Number(pItem.rate) || 0;
        }
        if (rate <= 0) {
          rate = itemDoc.standardRate || 0;
        }

        const currentStock = Number(gs.currentStock) || 0;
        const entryDate = (gs as any).createdAt || (gs as any).purchaseId?.date || (gs as any).stockTransferId?.date;
        const formattedDate = formatDate(entryDate);
        const isoDate = entryDate ? (entryDate instanceof Date ? entryDate.toISOString() : new Date(entryDate).toISOString()) : undefined;

        // If replacing an un-reconciled purchase batch key with this specific stock document, remove previous generic key
        const genericKey = `${gId}_${dcNo}_${lotNo}`;
        if (batchesForThisItem.has(genericKey) && batchKey !== genericKey) {
          batchesForThisItem.delete(genericKey);
        }

        const gsUomQty = Number(gs.uomQuantity) || 0;
        if (currentStock > 0) {
          const val = Number((currentStock * rate).toFixed(2));
          batchesForThisItem.set(batchKey, {
            dcNo,
            lotNo,
            batchNo: dcNo,
            godownId: gId,
            uomQuantity: gsUomQty,
            quantity: currentStock,
            value: val,
            rate: rate,
            date: isoDate,
            formattedDate,
          });
        } else if (showZero) {
          batchesForThisItem.set(batchKey, {
            dcNo,
            lotNo,
            batchNo: dcNo,
            godownId: gId,
            uomQuantity: 0,
            quantity: 0,
            value: 0,
            rate: rate,
            date: isoDate,
            formattedDate,
          });
        } else {
          batchesForThisItem.delete(batchKey);
        }
      }

      // 6. Build Hierarchical Structure: Group -> Items -> Batches
      const groupMap = new Map<string, {
        groupId: string;
        groupName: string;
        groupCode: string;
        items: StockSummaryItemDTO[];
        totalQuantity: number;
        totalUomQuantity: number;
        totalValue: number;
        uom: string;
        uomSymbol: string;
        perSymbol: string;
      }>();

      for (const item of allItems) {
        const iId = item._id.toString();
        const perSymbol = item.defaultPerId?.symbol || "kg";
        const uomSymbol = item.defaultUomId?.symbol || "BAG";
        const batchesMap = itemBatchLinesMap.get(iId);

        const batchDTOs: StockSummaryBatchDTO[] = [];
        let itemQuantity = 0;
        let itemUomQuantity = 0;
        let itemValue = 0;

        if (batchesMap) {
          for (const b of batchesMap.values()) {
            const godownDoc = accessibleGodownMap.get(b.godownId);
            const godownName = godownDoc?.name || "Godown";
            const godownCode = godownDoc?.godownId;
            const dcVal = b.dcNo && b.dcNo.trim().length > 0 ? b.dcNo.trim() : (b.batchNo && b.batchNo.trim().length > 0 ? b.batchNo.trim() : "");
            const lotVal = b.lotNo && b.lotNo.trim().length > 0 ? b.lotNo.trim() : "";
            const dcLabel = dcVal.length > 0 ? `DC No: ${dcVal}` : "";
            const lotLabel = lotVal.length > 0 ? `Lot No: ${lotVal}` : "";
            const parts = [godownName, dcLabel, lotLabel].filter((p) => p && p.length > 0);
            const particulars = parts.join(" ");

            const bUomQty = Number((b.uomQuantity || 0).toFixed(3));
            itemQuantity += b.quantity;
            itemUomQuantity += bUomQty;
            itemValue += b.value;

            batchDTOs.push({
              dcNo: dcVal,
              lotNo: lotVal,
              batchNo: dcVal,
              godownId: b.godownId,
              godownName,
              godownCode,
              date: b.date,
              formattedDate: b.formattedDate,
              particulars,
              uomQuantity: bUomQty,
              formattedUomQuantity: formatQuantity(bUomQty, uomSymbol),
              quantity: Number(b.quantity.toFixed(3)),
              rate: Number(b.rate.toFixed(2)),
              value: Number(b.value.toFixed(2)),
              formattedQuantity: formatQuantity(b.quantity, perSymbol),
              formattedRate: formatRate(b.rate),
              formattedValue: formatIndianCurrency(b.value),
              uom: perSymbol,
              uomSymbol,
              perSymbol,
            });
          }
        }

        // If item has 0 stock and showZero is false, skip
        if (!showZero && itemQuantity === 0 && itemValue === 0) {
          continue;
        }

        const avgRate = itemQuantity > 0
          ? Number((itemValue / itemQuantity).toFixed(2))
          : item.standardRate || 0;

        // Sort batches by particulars
        batchDTOs.sort((a, b) => {
          if (a.date && b.date) {
            const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (diff !== 0) return diff;
          }
          return a.particulars.localeCompare(b.particulars);
        });

        const itemDTO: StockSummaryItemDTO = {
          itemId: iId,
          itemName: item.name,
          itemCode: item.itemCode,
          groupId: item.itemGroupId?._id?.toString() || item.itemGroupId?.toString(),
          groupName: item.itemGroupId?.name || "General",
          uom: perSymbol,
          uomSymbol,
          perSymbol,
          quantity: Number(itemQuantity.toFixed(3)),
          uomQuantity: Number(itemUomQuantity.toFixed(3)),
          averageRate: avgRate,
          totalValue: Number(itemValue.toFixed(2)),
          formattedQuantity: formatQuantity(itemQuantity, perSymbol),
          formattedUomQuantity: formatQuantity(itemUomQuantity, uomSymbol),
          formattedRate: formatRate(avgRate),
          formattedValue: formatIndianCurrency(itemValue),
          batchesCount: batchDTOs.length,
          batches: batchDTOs,
        };

        const grpId = itemDTO.groupId || "primary";
        const grpName = itemDTO.groupName || "Primary";
        const grpCode = item.itemGroupId?.code || "GEN";

        if (!groupMap.has(grpId)) {
          groupMap.set(grpId, {
            groupId: grpId,
            groupName: grpName,
            groupCode: grpCode,
            items: [],
            totalQuantity: 0,
            totalUomQuantity: 0,
            totalValue: 0,
            uom: perSymbol,
            uomSymbol,
            perSymbol,
          });
        }

        const grpEntry = groupMap.get(grpId)!;
        grpEntry.items.push(itemDTO);
        grpEntry.totalQuantity += itemQuantity;
        grpEntry.totalUomQuantity += itemUomQuantity;
        grpEntry.totalValue += itemValue;
      }

      // 7. Format Groups and Grand Total
      const groupDTOs: StockSummaryGroupDTO[] = [];
      let grandTotalQty = 0;
      let grandTotalUomQty = 0;
      let grandTotalVal = 0;
      let totalItemCount = 0;

      for (const grp of groupMap.values()) {
        if (!showZero && grp.totalQuantity === 0 && grp.totalValue === 0) {
          continue;
        }

        const grpAvgRate = grp.totalQuantity > 0
          ? Number((grp.totalValue / grp.totalQuantity).toFixed(2))
          : 0;

        // Sort items inside group alphabetically
        grp.items.sort((a, b) => a.itemName.localeCompare(b.itemName));

        grandTotalQty += grp.totalQuantity;
        grandTotalUomQty += grp.totalUomQuantity;
        grandTotalVal += grp.totalValue;
        totalItemCount += grp.items.length;

        groupDTOs.push({
          groupId: grp.groupId,
          groupName: grp.groupName,
          groupCode: grp.groupCode,
          uom: grp.uom,
          uomSymbol: grp.uomSymbol,
          perSymbol: grp.perSymbol,
          totalQuantity: Number(grp.totalQuantity.toFixed(3)),
          totalUomQuantity: Number(grp.totalUomQuantity.toFixed(3)),
          averageRate: grpAvgRate,
          totalValue: Number(grp.totalValue.toFixed(2)),
          formattedQuantity: formatQuantity(grp.totalQuantity, grp.perSymbol),
          formattedUomQuantity: formatQuantity(grp.totalUomQuantity, grp.uomSymbol),
          formattedRate: formatRate(grpAvgRate),
          formattedValue: formatIndianCurrency(grp.totalValue),
          itemsCount: grp.items.length,
          items: grp.items,
        });
      }

      // Sort groups alphabetically by name
      groupDTOs.sort((a, b) => a.groupName.localeCompare(b.groupName));

      const grandAvgRate = grandTotalQty > 0
        ? Number((grandTotalVal / grandTotalQty).toFixed(2))
        : 0;

      return {
        companyName: "ML Fabric",
        period: {
          startDate: fromDate ? fromDate.toISOString() : undefined,
          endDate: toDate ? toDate.toISOString() : undefined,
          formattedPeriod,
        },
        godownFilter: {
          godownId: dto.godownId,
          godownName: selectedGodownName,
        },
        groups: groupDTOs,
        grandTotal: {
          totalQuantity: Number(grandTotalQty.toFixed(3)),
          totalUomQuantity: Number(grandTotalUomQty.toFixed(3)),
          averageRate: grandAvgRate,
          totalValue: Number(grandTotalVal.toFixed(2)),
          formattedQuantity: formatQuantity(grandTotalQty, "kg"),
          formattedUomQuantity: formatQuantity(grandTotalUomQty, "BAG"),
          formattedRate: formatRate(grandAvgRate),
          formattedValue: formatIndianCurrency(grandTotalVal),
          groupsCount: groupDTOs.length,
          itemsCount: totalItemCount,
        },
      };
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockSummaryUseCase, this.logger);
      throw error;
    }
  }

  private buildEmptyResponse(selectedGodownName?: string, godownId?: string): StockSummaryResponseDTO {
    return {
      companyName: "ML Fabric",
      period: {
        formattedPeriod: "1-Apr-2026 to 31-Mar-2027",
      },
      godownFilter: {
        godownId,
        godownName: selectedGodownName,
      },
      groups: [],
      grandTotal: {
        totalQuantity: 0,
        averageRate: 0,
        totalValue: 0,
        formattedQuantity: "0.000 kg",
        formattedRate: "0.00",
        formattedValue: "0.00",
        groupsCount: 0,
        itemsCount: 0,
      },
    };
  }

  private getFormattedPeriod(fromDate?: Date, toDate?: Date): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (fromDate && toDate) {
      return `${fromDate.getDate()}-${months[fromDate.getMonth()]}-${fromDate.getFullYear()} to ${toDate.getDate()}-${months[toDate.getMonth()]}-${toDate.getFullYear()}`;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    return `1-Apr-${startYear} to ${now.getDate()}-${months[now.getMonth()]}-${currentYear}`;
  }
}
