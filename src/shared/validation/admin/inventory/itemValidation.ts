import { z } from "zod";

export const CreateItemRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Item name is required").max(120),
    itemCode: z.string().trim().max(50).optional(),
    itemGroupId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item Group ID").optional().nullable(),
    description: z.string().trim().max(300).optional(),
    defaultUomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid default UOM ID"),
    defaultPerId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid default Per Unit ID"),
    hsnCodeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid HSN Code ID").optional().nullable(),
    hsnCode: z.string().trim().max(30).optional(),
    standardRate: z.number().min(0, "Standard rate cannot be negative").optional(),
    openingStock: z.number().min(0, "Opening stock cannot be negative").optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateItemRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Item name cannot be empty").max(120).optional(),
    itemCode: z.string().trim().max(50).optional(),
    itemGroupId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item Group ID").optional().nullable(),
    description: z.string().trim().max(300).optional(),
    defaultUomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid default UOM ID").optional(),
    defaultPerId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid default Per Unit ID").optional(),
    hsnCodeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid HSN Code ID").optional().nullable(),
    hsnCode: z.string().trim().max(30).optional(),
    standardRate: z.number().min(0, "Standard rate cannot be negative").optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeleteItemRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item ID"),
  }),
});
