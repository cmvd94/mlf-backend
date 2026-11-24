import { z } from "zod";

export const CreateHsnCodeRouteSchema = z.object({
  body: z.object({
    hsnCode: z.string().trim().min(1, "HSN code is required").max(30),
    description: z.string().trim().max(300).optional(),
    gstRate: z.number().min(0, "GST rate cannot be negative").max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateHsnCodeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid HSN Code ID"),
  }),
  body: z.object({
    hsnCode: z.string().trim().min(1, "HSN code cannot be empty").max(30).optional(),
    description: z.string().trim().max(300).optional(),
    gstRate: z.number().min(0, "GST rate cannot be negative").max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeleteHsnCodeRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid HSN Code ID"),
  }),
});
