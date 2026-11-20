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
import { formatIndianCurrency, formatQuantity, formatRate } from "@/shared/utils/formatUtils";
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
        batchNo: string;
        godownId: string;
        quantity: number;
        value: number;
        rate: number;
      }>>();

      for (const pb of purchaseBatches) {
        if (!itemBatchLinesMap.has(pb.itemId)) {
          itemBatchLinesMap.set(pb.itemId, new Map());
        }
        const batchKey = `${pb.godownId}_${pb.batchNo}`;
        const existing = itemBatchLinesMap.get(pb.itemId)!.get(batchKey);
        if (existing) {
          existing.quantity += pb.quantity;
          existing.value += pb.value;
          existing.rate = existing.quantity > 0 ? Number((existing.value / existing.quantity).toFixed(2)) : pb.rate;
        } else {
          itemBatchLinesMap.get(pb.itemId)!.set(batchKey, {
            batchNo: pb.batchNo,
            godownId: pb.godownId,
            quantity: pb.quantity,
            value: pb.value,
            rate: pb.rate,
          });
        }
      }

      // Reconcile items that have godown stock but no explicit purchase batch entries
      for (const gs of godownStocks) {
        const iId = gs.itemId.toString();
        const gId = gs.godownId.toString();
        const itemDoc = itemMap.get(iId);
        if (!itemDoc) continue;

        if (!itemBatchLinesMap.has(iId)) {
          itemBatchLinesMap.set(iId, new Map());
        }

        const batchesForThisItem = itemBatchLinesMap.get(iId)!;
        // If no batches exist for this item in this godown, add an entry
        let hasAnyBatchInThisGodown = false;
        for (const b of batchesForThisItem.values()) {
          if (b.godownId === gId) {
            hasAnyBatchInThisGodown = true;
            break;
          }
        }

        if (!hasAnyBatchInThisGodown && gs.currentStock > 0) {
          const stdRate = itemDoc.standardRate || 0;
          const qty = Number(gs.currentStock);
          const val = Number((qty * stdRate).toFixed(2));
          batchesForThisItem.set(`${gId}_`, {
            batchNo: "",
            godownId: gId,
            quantity: qty,
            value: val,
            rate: stdRate,
          });
        }
      }

      // 6. Build Hierarchical Structure: Group -> Items -> Batches
      const groupMap = new Map<string, {
        groupId: string;
        groupName: string;
        groupCode: string;
        items: StockSummaryItemDTO[];
        totalQuantity: number;
        totalValue: number;
        uom: string;
      }>();

      const showZero = Boolean(dto.showZeroStock);

      for (const item of allItems) {
        const iId = item._id.toString();
        const uomSymbol = item.defaultUomId?.symbol || "kg";
        const batchesMap = itemBatchLinesMap.get(iId);

        const batchDTOs: StockSummaryBatchDTO[] = [];
        let itemQuantity = 0;
        let itemValue = 0;

        if (batchesMap) {
          for (const b of batchesMap.values()) {
            const godownDoc = accessibleGodownMap.get(b.godownId);
            const godownName = godownDoc?.name || "Godown";
            const godownCode = godownDoc?.godownId;
            const batchLabel = b.batchNo && b.batchNo.trim().length > 0 ? b.batchNo.trim() : "";
            const particulars = batchLabel.length > 0 ? `${batchLabel} ${godownName}` : godownName;

            itemQuantity += b.quantity;
            itemValue += b.value;

            batchDTOs.push({
              batchNo: batchLabel,
              godownId: b.godownId,
              godownName,
              godownCode,
              particulars,
              quantity: Number(b.quantity.toFixed(3)),
              rate: Number(b.rate.toFixed(2)),
              value: Number(b.value.toFixed(2)),
              formattedQuantity: formatQuantity(b.quantity, uomSymbol),
              formattedRate: formatRate(b.rate),
              formattedValue: formatIndianCurrency(b.value),
              uom: uomSymbol,
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
        batchDTOs.sort((a, b) => a.particulars.localeCompare(b.particulars));

        const itemDTO: StockSummaryItemDTO = {
          itemId: iId,
          itemName: item.name,
          itemCode: item.itemCode,
          groupId: item.itemGroupId?._id?.toString() || item.itemGroupId?.toString(),
          groupName: item.itemGroupId?.name || "General",
          uom: uomSymbol,
          quantity: Number(itemQuantity.toFixed(3)),
          averageRate: avgRate,
          totalValue: Number(itemValue.toFixed(2)),
          formattedQuantity: formatQuantity(itemQuantity, uomSymbol),
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
            totalValue: 0,
            uom: uomSymbol,
          });
        }

        const grpEntry = groupMap.get(grpId)!;
        grpEntry.items.push(itemDTO);
        grpEntry.totalQuantity += itemQuantity;
        grpEntry.totalValue += itemValue;
      }

      // 7. Format Groups and Grand Total
      const groupDTOs: StockSummaryGroupDTO[] = [];
      let grandTotalQty = 0;
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
        grandTotalVal += grp.totalValue;
        totalItemCount += grp.items.length;

        groupDTOs.push({
          groupId: grp.groupId,
          groupName: grp.groupName,
          groupCode: grp.groupCode,
          uom: grp.uom,
          totalQuantity: Number(grp.totalQuantity.toFixed(3)),
          averageRate: grpAvgRate,
          totalValue: Number(grp.totalValue.toFixed(2)),
          formattedQuantity: formatQuantity(grp.totalQuantity, grp.uom),
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
          averageRate: grandAvgRate,
          totalValue: Number(grandTotalVal.toFixed(2)),
          formattedQuantity: formatQuantity(grandTotalQty, "kg"),
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
