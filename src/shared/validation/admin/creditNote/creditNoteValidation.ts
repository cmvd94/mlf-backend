import { z } from "zod";

export const CreditNoteItemSchema = z.object({
  itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID"),
  godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID"),
  companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
  dcNo: z.string().trim().optional().default(""),
  lotNo: z.string().trim().optional().default(""),
  batchNo: z.string().trim().optional().default(""),
  uomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID"),
  uomQuantity: z.number().positive("UOM quantity must be greater than 0"),
  actualQuantity: z.number().positive("Actual quantity must be greater than 0"),
  billedQuantity: z.number().positive("Billed quantity must be greater than 0"),
  rate: z.number().min(0, "Rate cannot be negative"),
  perId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID"),
});

export const CreateCreditNoteRouteSchema = z.object({
  body: z.preprocess(
    (data: any) => {
      if (data && typeof data === "object") {
        if (!data.companyGodownId && data.godownId) {
          data.companyGodownId = data.godownId;
        }
        if ((!data.items || !Array.isArray(data.items) || data.items.length === 0) && data.itemId) {
          data.items = [
            {
              itemId: data.itemId,
              godownId: data.godownId,
              companyGodownId: data.companyGodownId,
              dcNo: data.dcNo ?? data.batchNo ?? "",
              lotNo: data.lotNo ?? "",
              batchNo: data.batchNo ?? "",
              uomId: data.uomId,
              uomQuantity: data.uomQuantity ?? data.actualQuantity ?? 1,
              actualQuantity: data.actualQuantity,
              billedQuantity: data.billedQuantity,
              rate: data.rate,
              perId: data.perId,
            },
          ];
        }
      }
      return data;
    },
    z.object({
      date: z.string().min(1, "Date is required"),
      partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID"),
      purchaseTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID").optional(),
      creditNoteTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note Type ID").optional(),
      companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID"),
      items: z.array(CreditNoteItemSchema).min(1, "At least one item is required in credit note"),
      isGstBill: z.boolean().optional(),
      gstPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().trim().max(500).optional(),
      godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    })
  ),
});

export const UpdateCreditNoteRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note ID"),
  }),
  body: z.object({
    date: z.string().min(1, "Date is required").optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
    purchaseTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID").optional(),
    creditNoteTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note Type ID").optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    items: z.array(CreditNoteItemSchema).min(1, "At least one item is required in credit note").optional(),
    isGstBill: z.boolean().optional(),
    gstPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
  }),
});

export const DeleteCreditNoteRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note ID"),
  }),
});

export const GetCreditNoteByIdRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note ID"),
  }),
});

export const GetCreditNoteListRouteSchema = z.object({
  query: z.object({
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
    search: z.string().trim().optional(),
    partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
    purchaseTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID").optional(),
    creditNoteTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Credit Note Type ID").optional(),
    companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});
