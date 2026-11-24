import { z } from "zod";

export const DebitNoteItemSchema = z.preprocess(
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
    uomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID").optional(),
    uomQuantity: z.number().positive("UOM quantity must be greater than 0").optional(),
    actualQuantity: z.number().positive("Actual quantity must be greater than 0"),
    billedQuantity: z.number().positive("Billed quantity must be greater than 0"),
    quantity: z.number().positive().optional(),
    rate: z.number().min(0, "Rate cannot be negative"),
    perId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID").optional(),
  })
);

export const CreateDebitNoteRouteSchema = z.object({
  body: z.object({
    date: z.string().min(1, "Voucher date is required"),
    salesTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID").optional(),
    debitNoteTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Debit Note Type ID").optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID"),
    dcNo: z.string().trim().optional().default(""),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    items: z.array(DebitNoteItemSchema).min(1, "At least one item is required for debit note"),
    isGstBill: z.boolean().optional().default(false),
    gstPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    narration: z.string().trim().max(1000).optional(),
  }),
});

export const UpdateDebitNoteRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Debit Note ID"),
  }),
  body: z.object({
    date: z.string().optional(),
    salesTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID").optional(),
    debitNoteTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Debit Note Type ID").optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
    dcNo: z.string().trim().optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    items: z.array(DebitNoteItemSchema).min(1, "At least one item is required").optional(),
    isGstBill: z.boolean().optional(),
    gstPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    narration: z.string().trim().max(1000).optional(),
  }),
});

export const DeleteDebitNoteRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Debit Note ID"),
  }),
});

export const GetDebitNoteByIdRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Debit Note ID"),
  }),
});

export const GetDebitNoteListRouteSchema = z.object({
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

export const GetAvailableStockForDebitNoteRouteSchema = z.object({
  query: z.object({
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID").optional(),
    search: z.string().trim().optional(),
  }),
});
