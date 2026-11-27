import { z } from "zod";

export const SaleItemSchema = z.preprocess(
  (data: any) => {
    if (data && typeof data === "object") {
      const actQty = data.actualQuantity ?? data.quantity;
      const bldQty = data.billedQuantity ?? data.quantity ?? actQty;
      data.actualQuantity = actQty;
      data.billedQuantity = bldQty;
      data.quantity = actQty;
    }
    return data;
  },
  z.object({
    godownStockId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown Stock ID"),
    itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID").optional(),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    dcNo: z.string().trim().optional(),
    lotNo: z.string().trim().optional(),
    hsnCode: z.string().trim().optional(),
    uomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID").optional(),
    uomQuantity: z.number().positive("UOM quantity must be greater than 0").optional(),
    actualQuantity: z.number().positive("Actual quantity must be greater than 0"),
    billedQuantity: z.number().positive("Billed quantity must be greater than 0"),
    quantity: z.number().positive().optional(),
    rate: z.number().min(0, "Rate cannot be negative"),
    perId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID").optional(),
  })
);

export const CreateSaleRouteSchema = z.object({
  body: z.object({
    date: z.string().min(1, "Voucher date is required"),
    salesTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID"),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID"),
    invoiceNo: z.string().trim().optional().default(""),
    dcNo: z.string().trim().optional().default(""),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    items: z.array(SaleItemSchema).min(1, "At least one item is required for sale"),
    isGstBill: z.boolean().optional().default(false),
    gstPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    narration: z.string().trim().max(1000).optional(),
  }),
});

export const UpdateSaleRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sale ID"),
  }),
  body: z.object({
    date: z.string().optional(),
    salesTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID").optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
    invoiceNo: z.string().trim().optional(),
    dcNo: z.string().trim().optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    items: z.array(SaleItemSchema).min(1, "At least one item is required").optional(),
    isGstBill: z.boolean().optional(),
    gstPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    narration: z.string().trim().max(1000).optional(),
  }),
});

export const DeleteSaleRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sale ID"),
  }),
});

export const GetSaleByIdRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sale ID"),
  }),
});

export const GetSaleListRouteSchema = z.object({
  query: z.object({
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
    search: z.string().trim().optional(),
    salesTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID").optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const GetAvailableStockForSaleRouteSchema = z.object({
  query: z.object({
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID").optional(),
    search: z.string().trim().optional(),
    saleId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sale ID").optional(),
  }),
});
