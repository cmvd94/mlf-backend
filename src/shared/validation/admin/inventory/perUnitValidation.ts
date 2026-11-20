import { z } from "zod";

export const CreatePerUnitRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Per unit name is required").max(60),
    symbol: z.string().trim().min(1, "Symbol is required").max(20),
    multiplier: z.number().positive("Multiplier must be positive").default(1),
    description: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdatePerUnitRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Per unit name cannot be empty").max(60).optional(),
    symbol: z.string().trim().min(1, "Symbol cannot be empty").max(20).optional(),
    multiplier: z.number().positive("Multiplier must be positive").optional(),
    description: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeletePerUnitRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Per Unit ID"),
  }),
});
