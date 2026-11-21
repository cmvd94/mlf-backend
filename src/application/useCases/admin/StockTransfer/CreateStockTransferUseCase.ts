import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StockTransferRepository } from "@/infrastructure/repositories/admin/StockTransferRepository";
import { GodownStockRepository } from "@/infrastructure/repositories/admin/GodownStockRepository";
import { ItemRepository } from "@/infrastructure/repositories/admin/ItemRepository";
import { GodownRepository } from "@/infrastructure/repositories/admin/GodownRepository";
import { UomRepository } from "@/infrastructure/repositories/admin/UomRepository";
import { PerUnitRepository } from "@/infrastructure/repositories/admin/PerUnitRepository";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";
import { CreateStockTransferDTO } from "@/shared/dto/admin/stockTransferDTO";
import { ReqAdminDTO } from "@/shared/dto/admin/reqAdminDTO";
import { generateObjectId } from "@/shared/utils/generateObjectId";
import { compareAdminAndGodownLocation, validateStockModificationAccess, validateStockModificationAccessWithFetch } from "@/shared/utils/godownQueryHelper";
import { parseVoucherDate } from "@/shared/utils/formatUtils";
import { ErrorHandler } from "@/shared/utils/ErrorHandler";
import { AdminErrorStage } from "@/shared/constants/errorStage";
import { withTransaction } from "@/shared/utils/withTransaction";
import { ClientSession } from "mongoose";
import { StockSourceType } from "@/domain/entities/admin/GodownStock";
import HttpException from "@/shared/exceptions/HttpException";
import { ERROR_CODES, ERROR_MESSAGES } from "@/shared/constants/errorCodesMessages";

@injectable()
export class CreateStockTransferUseCase {
  constructor(
    @inject(StockTransferRepository) private stockTransferRepository: StockTransferRepository,
    @inject(GodownStockRepository) private godownStockRepository: GodownStockRepository,
    @inject(ItemRepository) private itemRepository: ItemRepository,
    @inject(GodownRepository) private godownRepository: GodownRepository,
    @inject(UomRepository) private uomRepository: UomRepository,
    @inject(PerUnitRepository) private perUnitRepository: PerUnitRepository,
    @inject(CounterRepository) private counterRepository: CounterRepository,
    @inject("AdminLogger") private logger: Logger
  ) {}

  async execute(dto: CreateStockTransferDTO, reqAdmin: ReqAdminDTO) {
    try {
      if (!dto.sourceItems || dto.sourceItems.length === 0) {
        throw new HttpException(400, "At least one source item is required for transfer", ERROR_CODES.VALIDATION_ERROR);
      }
      if (!dto.destinationItems || dto.destinationItems.length === 0) {
        throw new HttpException(400, "At least one destination item is required for transfer", ERROR_CODES.VALIDATION_ERROR);
      }

      const transferObjectId = generateObjectId();

      // 1. Validate Source (Consumption) items
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

        // Validate stock modification permission on the company godown that owns this stock
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

        // Hierarchy and regional access check on source godown
        const hasSourceAccess = compareAdminAndGodownLocation(reqAdmin, sourceGodown);
        if (!hasSourceAccess) {
          throw new HttpException(403, ERROR_MESSAGES.GODOWN_ACCESS_DENIED, ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        const requestedQty = Number(src.quantity);
        if (requestedQty <= 0) {
          throw new HttpException(400, "Source quantity must be greater than zero", ERROR_CODES.VALIDATION_ERROR);
        }

        if (Number(stockDoc.currentStock) < requestedQty) {
          throw new HttpException(
            400,
            `Insufficient stock for batch '${stockDoc.batchNo || "N/A"}'. Available: ${stockDoc.currentStock}, Requested: ${requestedQty}`,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        totalSourceQuantity += requestedQty;

        const sourceItemId = (stockDoc.itemId?._id || stockDoc.itemId).toString();
        const sourceGodownId = (sourceGodown._id || sourceGodown).toString();
        const companyGodownId = (ownerCompanyGodown._id || ownerCompanyGodown).toString();

        // Resolve source UOM & UOM quantity: allow selection or default to batch UOM
        const rawSourceUom = src.uomId || stockDoc.uomId;
        const sourceUomId = rawSourceUom ? ((rawSourceUom as any)._id || rawSourceUom).toString() : undefined;
        const sourceUomQty = src.uomQuantity !== undefined ? Number(src.uomQuantity) : (stockDoc.uomQuantity || 1);

        // Resolve rate from input, stock batch, purchase, or item standard rate
        let sourceRate = Number(src.rate) || Number(stockDoc.rate) || 0;
        if (sourceRate <= 0 && stockDoc.purchaseId?.items) {
          const pItem = stockDoc.purchaseId.items.find((it: any) =>
            (it.batchNo && it.batchNo.trim() === (stockDoc.batchNo || "").trim()) ||
            (it.itemId && it.itemId.toString() === sourceItemId)
          );
          if (pItem) sourceRate = Number(pItem.rate) || 0;
        }
        if (sourceRate <= 0 && stockDoc.itemId?.standardRate) {
          sourceRate = Number(stockDoc.itemId.standardRate) || 0;
        }

        preparedSourceItems.push({
          stockDocId: stockDoc._id,
          sourceItemId,
          sourceGodownId,
          companyGodownId,
          batchNo: (stockDoc.batchNo || "").trim(),
          requestedQty,
          uomId: sourceUomId,
          uomQuantity: sourceUomQty,
          rate: sourceRate,
        });
      }

      // 2. Validate Destination (Production / Movement) items
      const preparedDestItems: any[] = [];
      let totalDestinationQuantity = 0;

      for (const dest of dto.destinationItems) {
        // Destination godown verification
        const destGodown = await this.godownRepository.findGodownById(dest.godownId);
        if (!destGodown || destGodown.isDeleted) {
          throw new HttpException(404, "Destination godown not found", ERROR_CODES.GODOWN_NOT_FOUND);
        }
        if (!destGodown.isActive) {
          throw new HttpException(400, "Destination godown is inactive", ERROR_CODES.GODOWN_INACTIVE);
        }

        // Hierarchy access check on destination godown
        const hasDestAccess = compareAdminAndGodownLocation(reqAdmin, destGodown);
        if (!hasDestAccess) {
          throw new HttpException(403, "Access denied to destination godown", ERROR_CODES.GODOWN_ACCESS_DENIED);
        }

        // Destination item verification
        const destItem: any = await this.itemRepository.getItemById(dest.itemId);
        if (!destItem || !destItem.isActive) {
          throw new HttpException(404, "Destination item not found or inactive", ERROR_CODES.ITEM_NOT_FOUND);
        }

        // Resolve UOM & UOM quantity safely from input or item defaults
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

        let destRate = Number(dest.rate) || 0;
        if (destRate <= 0) {
          destRate = preparedSourceItems[0]?.rate || Number(destItem.standardRate) || 0;
        }

        preparedDestItems.push({
          destGodownId: destGodown._id,
          destItemId: destItem._id,
          batchNo: newBatchNo,
          destQty,
          uomId,
          uomQuantity,
          rate: destRate,
        });
      }

      // 3. Atomically execute all inventory adjustments and transfer creation inside a transaction
      await withTransaction(async (session: ClientSession) => {
        const calculatedSourceItems: any[] = [];
        const calculatedDestinationItems: any[] = [];

        // Deduct source stock
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

          // Adjust aggregate source item stock
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

        const primaryCompanyGodownId = preparedSourceItems[0]?.companyGodownId;

        // Create destination batch stocks and increase aggregate item stock
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
              rate: dest.rate,
              uomId: dest.uomId ? generateObjectId(dest.uomId) : undefined,
              uomQuantity: dest.uomQuantity,
              stockTransferId: transferObjectId,
              sourceType: StockSourceType.TRANSFER,
              createdBy: reqAdmin.userId,
              updatedBy: reqAdmin.userId,
            },
            session
          );

          // Adjust aggregate destination item stock
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

        // Generate sequential Transfer Voucher number within transaction
        const seq = await this.counterRepository.getNextSequence("STOCK_TRANSFER_NUMBER", this.logger, session);
        const transferNumber = `ST_${seq.toString().padStart(4, "0")}`;

        const totalSourceAmount = calculatedSourceItems.reduce((acc, it) => acc + (it.amount || 0), 0);
        const totalDestinationAmount = calculatedDestinationItems.reduce((acc, it) => acc + (it.amount || 0), 0);

        // Create StockTransfer voucher
        await this.stockTransferRepository.createStockTransfer(
          {
            _id: transferObjectId,
            transferNumber,
            date: parseVoucherDate(dto.date),
            sourceItems: calculatedSourceItems,
            destinationItems: calculatedDestinationItems,
            totalSourceQuantity,
            totalSourceAmount,
            totalDestinationQuantity,
            totalDestinationAmount,
            narration: dto.narration?.trim() || "",
            isActive: true,
            createdBy: generateObjectId(reqAdmin.userId) as any,
          },
          session
        );
      });

      return await this.stockTransferRepository.getStockTransferById(transferObjectId);
    } catch (error) {
      ErrorHandler.handleError(error, AdminErrorStage.StockTransferUseCase, this.logger);
    }
  }
}
