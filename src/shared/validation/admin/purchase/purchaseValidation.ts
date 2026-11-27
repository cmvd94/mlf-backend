import { z } from "zod";

export const PurchaseItemSchema = z.object({
  godownStockId: z.string().optional().nullable(),
  _id: z.string().optional().nullable(),
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

export const CreatePurchaseRouteSchema = z.object({
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
      purchaseTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID"),
      companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID"),
      items: z.array(PurchaseItemSchema).min(1, "At least one item is required in purchase"),
      isGstBill: z.boolean().optional(),
      gstPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().trim().max(500).optional(),
      godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    })
  ),
});

export const UpdatePurchaseRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase ID"),
  }),
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
              godownId: data.godownId || data.companyGodownId,
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
              godownStockId: data.godownStockId,
            },
          ];
        }
      }
      return data;
    },
    z.object({
      date: z.string().min(1, "Date is required").optional(),
      partyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID").optional(),
      purchaseTypeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID").optional(),
      companyGodownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Company Godown ID").optional(),
      items: z.array(PurchaseItemSchema).min(1, "At least one item is required in purchase").optional(),
      isGstBill: z.boolean().optional(),
      gstPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().trim().max(500).optional(),
      godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    })
  ),
});

export const DeletePurchaseRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase ID"),
  }),
});

export const GetPurchaseByIdRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase ID"),
  }),
});
