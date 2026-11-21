import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { UpdateStockTransferDTO } from "@/shared/dto/admin/stockTransferDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { parseVoucherDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import { StockSourceType } from "@/domain/entities/admin/GodownStock";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class UpdateStockTransferUseCase {
  constructor(
    @inject(StockTransferRepository) private stockTransferRepository: StockTransferRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(id: string, dto: UpdateStockTransferDTO, reqAdmin: ReqAdminDTO) {
    try {
      const existingTransfer: any = await this.stockTransferRepository.getStockTransferById(id);
      if (!existingTransfer || existingTransfer.isDeleted) {
        throw new HttpException(404, "Stock transfer not found", ERROR_CODES.NOT_FOUND);
      }

      // Check access for existing transfer source and destination godowns
      for (const src of existingTransfer.sourceItems || []) {
        const sourceGodown = src.godownId;
        const ownerCompanyGodown = src.companyGodownId || sourceGodown;
        if (ownerCompanyGodown) {
          const canModify = await validateStockModificationAccessWithFetch(
            reqAdmin,
            ownerCompanyGodown,
            this.godownRepository
          );
          if (!canModify) {
            throw new HttpException(
              403,
              ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
              ERROR_CODES.GODOWN_ACCESS_DENIED
            );
          }
        }
        if (sourceGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, sourceGodown);
          if (!hasAccess) {
            throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      for (const dest of existingTransfer.destinationItems || []) {
        const destGodown = dest.godownId;
        if (destGodown) {
          const hasAccess = compareAdminAndGodownLocation(reqAdmin, destGodown);
          if (!hasAccess) {
            throw new HttpException(403, "Access denied to destination godown", ERROR_CODES.GODOWN_ACCESS_DENIED);
          }
        }
      }

      const hasItemUpdates = dto.sourceItems !== undefined || dto.destinationItems !== undefined;

      if (!hasItemUpdates) {
        // Only metadata update (date, narration)
        const updateFields: any = {
          updatedBy: generateObjectId(reqAdmin.userId),
        };
        if (dto.date) {
          updateFields.date = parseVoucherDate(dto.date);
        }
        if (dto.narration !== undefined) {
          updateFields.narration = dto.narration.trim();
        }

        await this.stockTransferRepository.updateStockTransfer(id, updateFields);
        return await this.stockTransferRepository.getStockTransferById(id);
      }

      // Item updates: both sourceItems and destinationItems are required
      if (!dto.sourceItems || dto.sourceItems.length === 0) {
        throw new HttpException(400, "At least one source item is required for transfer", ERROR_CODES.VALIDATION_ERROR);
      }
      if (!dto.destinationItems || dto.destinationItems.length === 0) {
        throw new HttpException(400, "At least one destination item is required for transfer", ERROR_CODES.VALIDATION_ERROR);
      }

      // Check whether any existing destination batches have already been consumed
      const existingStockDocs = await this.godownStockRepository.findByStockTransferId(existingTransfer._id);
      for (const stock of existingStockDocs) {
        const initial = Number(stock.initialStock !== undefined ? stock.initialStock : stock.currentStock) || 0;
        if (Number(stock.currentStock) < initial) {
          throw new HttpException(
            400,
            `Cannot update stock transfer because destination stock for batch "${stock.batchNo}" has already been transferred or consumed.`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
      }

      // Map existing consumption per source batch to credit back during availability check
      const oldQtyByStockId = new Map<string, number>();
      for (const oldSrc of existingTransfer.sourceItems || []) {
        const oldStockId = (oldSrc.godownStockId?._id || oldSrc.godownStockId).toString();
        oldQtyByStockId.set(oldStockId, (oldQtyByStockId.get(oldStockId) || 0) + Number(oldSrc.quantity || 0));
      }

      // 1. Validate new Source items
      const preparedSourceItems: any[] = [];
      let totalSourceQuantity = 0;

      for (const src of dto.sourceItems) {
        const stockDoc: any = await this.godownStockRepository.findById(src.godownStockId);
        if (!stockDoc || stockDoc.isDeleted) {
          throw new HttpException(404, "Source stock batch not found", ERROR_CODES.NOT_FOUND);
        }

        const sourceGodown = stockDoc.godownId;
        if (!sourceGodown || !sourceGodown.isActive) {
          throw new HttpException(400, "Source godown is inactive or not found", ERROR_CODES.GODOWN_INACTIVE);
        }

        const ownerCompanyGodown = stockDoc.companyGodownId || sourceGodown;
        const canModifyStock = await validateStockModificationAccessWithFetch(
          reqAdmin,
          ownerCompanyGodown,
          this.godownRepository
        );
        if (!canModifyStock) {
          throw new HttpException(
            403,
            ERROR_MESSAGES.STOCK_MODIFICATION_DENIED,
            ERROR_CODES.GODOWN_ACCESS_DENIED
          );
        }

        const hasSourceAccess = compareAdminAndGodownLocation(reqAdmin, sourceGodown);
        if (!hasSourceAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        const requestedQty = Number(src.quantity);
        if (requestedQty <= 0) {
          throw new HttpException(400, "Source quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
        }

        const stockDocId = stockDoc._id.toString();
        const availableStockIncludingRevert = Number(stockDoc.currentStock) + (oldQtyByStockId.get(stockDocId) || 0);

        if (availableStockIncludingRevert < requestedQty) {
          throw new HttpException(
            400,
            `Insufficient stock for batch '${stockDoc.batchNo || "N/A"}'. Available: ${availableStockIncludingRevert}, Requested: ${requestedQty}`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        totalSourceQuantity += requestedQty;

        const sourceItemId = (stockDoc.itemId?._id || stockDoc.itemId).toString();
        const sourceGodownId = (sourceGodown._id || sourceGodown).toString();
        const companyGodownId = (ownerCompanyGodown._id || ownerCompanyGodown).toString();

        const rawSourceUom = src.uomId || stockDoc.uomId;
        const sourceUomId = rawSourceUom ? ((rawSourceUom as any)._id || rawSourceUom).toString() : undefined;
        const sourceUomQty = src.uomQuantity !== undefined ? Number(src.uomQuantity) : (stockDoc.uomQuantity || 1);

        preparedSourceItems.push({
          stockDocId: stockDoc._id,
          sourceItemId,
          sourceGodownId,
          companyGodownId,
          batchNo: (stockDoc.batchNo || "").trim(),
          requestedQty,
          uomId: sourceUomId,
          uomQuantity: sourceUomQty,
          rate: src.rate !== undefined ? Number(src.rate) : (stockDoc.rate || 0),
        });
      }

      // 2. Validate new Destination items
      const preparedDestItems: any[] = [];
      let totalDestinationQuantity = 0;

      for (const dest of dto.destinationItems) {
        const destGodown = await this.godownRepository.findGodownById(dest.godownId);
        if (!destGodown || destGodown.isDeleted) {
          throw new HttpException(404, "Destination godown not found", ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!destGodown.isActive) {
          throw new HttpException(400, "Destination godown is inactive", ERROR_CODES.GODOWN_INACTIVE);
        }

        const hasDestAccess = compareAdminAndGodownLocation(reqAdmin, destGodown);
        if (!hasDestAccess) {
          throw new HttpException(403, "Access denied to destination godown", ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        const destItem: any = await this.itemRepository.getItemById(dest.itemId);
        if (!destItem || !destItem.isActive) {
          throw new HttpException(404, "Destination item not found or inactive", ERROR_CODES.ITEM_NOT_FOUND);
        }

        const destUomRaw = dest.uomId || destItem.defaultUomId;
        const uomId = destUomRaw ? ((destUomRaw as any)._id || destUomRaw).toString() : undefined;
        const uomQuantity = dest.uomQuantity !== undefined ? Number(dest.uomQuantity) : 1;

        const destQty = Number(dest.quantity);
        if (destQty <= 0) {
          throw new HttpException(400, "Destination quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
        }

        totalDestinationQuantity += destQty;

        const newBatchNo = (dest.batchNo || "").trim();
        if (!newBatchNo) {
          throw new HttpException(400, "Destination Batch / Lot number is required", ERROR_CODES.VALIDATION_ERROR);
        }

        preparedDestItems.push({
          destGodownId: destGodown._id,
          destItemId: destItem._id,
          batchNo: newBatchNo,
          destQty,
          uomId,
          uomQuantity,
          rate: dest.rate !== undefined ? Number(dest.rate) : 0,
        });
      }

      // 3. Atomically execute reversion of old transfer and application of new transfer
      await withTransaction(async (session: ClientSession) => {
        // A. Revert old destination
        for (const dest of existingTransfer.destinationItems || []) {
          const destItemId = (dest.itemId?._id || dest.itemId).toString();
          const destQty = Number(dest.quantity) || 0;
          await this.itemRepository.adjustStockQuantity(destItemId, -destQty, session);
        }
        await this.godownStockRepository.deleteByStockTransferId(existingTransfer._id, reqAdmin.userId, session);

        // B. Revert old source
        for (const src of existingTransfer.sourceItems || []) {
          const srcStockId = (src.godownStockId?._id || src.godownStockId).toString();
          const srcItemId = (src.itemId?._id || src.itemId).toString();
          const srcQty = Number(src.quantity) || 0;

          await this.godownStockRepository.increaseStock(srcStockId, srcQty, reqAdmin.userId, session);
          await this.itemRepository.adjustStockQuantity(srcItemId, srcQty, session);
        }

        // C. Apply new source deductions
        const calculatedSourceItems: any[] = [];
        for (const src of preparedSourceItems) {
          const updatedStock = await this.godownStockRepository.decreaseStock(
            src.stockDocId,
            src.requestedQty,
            reqAdmin.userId,
            session
          );
          if (!updatedStock) {
            throw new HttpException(
              400,
              `Could not deduct stock for batch '${src.batchNo || "N/A"}'. Stock may have changed.`,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }

          await this.itemRepository.adjustStockQuantity(src.sourceItemId, -src.requestedQty, session);

          calculatedSourceItems.push({
            godownStockId: src.stockDocId,
            itemId: generateObjectId(src.sourceItemId),
            godownId: generateObjectId(src.sourceGodownId),
            companyGodownId: generateObjectId(src.companyGodownId),
            batchNo: src.batchNo,
            quantity: src.requestedQty,
            rate: src.rate,
            amount: Number((src.requestedQty * src.rate).toFixed(2)),
            uomId: src.uomId ? generateObjectId(src.uomId) : undefined,
            uomQuantity: src.uomQuantity,
          });
        }

        // D. Apply new destination batches
        const calculatedDestinationItems: any[] = [];
        const primaryCompanyGodownId = preparedSourceItems[0]?.companyGodownId;

        for (const dest of preparedDestItems) {
          const destCompanyGodownId = primaryCompanyGodownId
            ? generateObjectId(primaryCompanyGodownId)
            : dest.destGodownId;

          const createdBatchDoc = await this.godownStockRepository.createBatchStock(
            {
              godownId: dest.destGodownId,
              companyGodownId: destCompanyGodownId,
              itemId: dest.destItemId,
              batchNo: dest.batchNo,
              currentStock: dest.destQty,
              initialStock: dest.destQty,
              uomId: dest.uomId ? generateObjectId(dest.uomId) : undefined,
              uomQuantity: dest.uomQuantity,
              stockTransferId: existingTransfer._id,
              sourceType: StockSourceType.TRANSFER,
              createdBy: reqAdmin.userId,
              updatedBy: reqAdmin.userId,
            },
            session
          );

          await this.itemRepository.adjustStockQuantity(dest.destItemId.toString(), dest.destQty, session);

          calculatedDestinationItems.push({
            itemId: dest.destItemId,
            godownId: dest.destGodownId,
            companyGodownId: destCompanyGodownId,
            batchNo: dest.batchNo,
            quantity: dest.destQty,
            rate: dest.rate,
            amount: Number((dest.destQty * dest.rate).toFixed(2)),
            uomId: dest.uomId ? generateObjectId(dest.uomId) : undefined,
            uomQuantity: dest.uomQuantity,
            destinationGodownStockId: createdBatchDoc._id,
          });
        }

        // E. Update StockTransfer voucher document
        const updateData: any = {
          date: dto.date ? parseVoucherDate(dto.date) : existingTransfer.date,
          sourceItems: calculatedSourceItems,
          destinationItems: calculatedDestinationItems,
          totalSourceQuantity,
          totalSourceAmount: calculatedSourceItems.reduce((acc, it) => acc + (it.amount || 0), 0),
          totalDestinationQuantity,
          totalDestinationAmount: calculatedDestinationItems.reduce((acc, it) => acc + (it.amount || 0), 0),
          narration: dto.narration !== undefined ? dto.narration.trim() : existingTransfer.narration,
          updatedBy: generateObjectId(reqAdmin.userId),
        };

        await this.stockTransferRepository.updateStockTransfer(existingTransfer._id, updateData, session);
      });

      return await this.stockTransferRepository.getStockTransferById(id);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
