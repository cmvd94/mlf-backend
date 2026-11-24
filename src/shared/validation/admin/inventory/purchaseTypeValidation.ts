import { z } from "zod";

export const CreatePurchaseTypeRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Purchase type name is required").max(100),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdatePurchaseTypeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Purchase type name cannot be empty").max(100).optional(),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeletePurchaseTypeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Purchase Type ID"),
  }),
});
