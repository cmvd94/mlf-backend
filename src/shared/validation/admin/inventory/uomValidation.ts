import { z } from "zod";

export const CreateUomRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "UOM name is required").max(60),
    symbol: z.string().trim().min(1, "Symbol is required").max(20),
    description: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateUomRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "UOM name cannot be empty").max(60).optional(),
    symbol: z.string().trim().min(1, "Symbol cannot be empty").max(20).optional(),
    description: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeleteUomRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid UOM ID"),
  }),
});
