import { z } from "zod";

export const StockTransferSourceItemSchema = z.object({
  godownStockId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown Stock ID"),
  quantity: z.number().positive("Source quantity must be greater than 0"),
  rate: z.number().min(0, "Rate cannot be negative").optional(),
  uomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID").optional(),
  uomQuantity: z.number().positive("Source UOM quantity must be greater than 0").optional(),
  perId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID").optional(),
});

export const StockTransferDestinationItemSchema = z.preprocess(
  (data: any) => {
    if (data && typeof data === "object") {
      if (!data.dcNo && data.batchNo) {
        data.dcNo = data.batchNo;
      }
    }
    return data;
  },
  z.object({
    itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID"),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID"),
    dcNo: z.string().trim().min(1, "Destination DC number is required"),
    lotNo: z.string().trim().optional().default(""),
    batchNo: z.string().trim().optional(),
    quantity: z.number().positive("Destination quantity must be greater than 0"),
    rate: z.number().min(0, "Rate cannot be negative").optional(),
    uomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID").optional(),
    uomQuantity: z.number().positive("UOM quantity must be greater than 0").optional(),
    perId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID").optional(),
  })
);

export const CreateStockTransferRouteSchema = z.object({
  body: z.object({
    date: z.string().min(1, "Voucher date is required"),
    sourceItems: z.array(StockTransferSourceItemSchema).min(1, "At least one source item is required for transfer"),
    destinationItems: z.array(StockTransferDestinationItemSchema).min(1, "At least one destination item is required for transfer"),
    narration: z.string().trim().max(1000).optional(),
    isGst: z.boolean().optional().default(false),
  }),
});

export const UpdateStockTransferRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Stock Transfer ID"),
  }),
  body: z.object({
    date: z.string().optional(),
    sourceItems: z.array(StockTransferSourceItemSchema).optional(),
    destinationItems: z.array(StockTransferDestinationItemSchema).optional(),
    narration: z.string().trim().max(1000).optional(),
    isGst: z.boolean().optional(),
  }),
});

export const DeleteStockTransferRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Stock Transfer ID"),
  }),
});

export const GetStockTransferListRouteSchema = z.object({
  query: z.object({
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    search: z.string().trim().optional(),
  }),
});

export const GetAvailableStockRouteSchema = z.object({
  query: z.object({
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID").optional(),
    search: z.string().trim().optional(),
  }),
});
