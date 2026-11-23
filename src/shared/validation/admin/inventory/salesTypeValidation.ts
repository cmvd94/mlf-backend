import { z } from "zod";

export const CreateSalesTypeRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Sales type name is required").max(100),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateSalesTypeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Sales type name cannot be empty").max(100).optional(),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeleteSalesTypeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Sales Type ID"),
  }),
});
