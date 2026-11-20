import { z } from "zod";

export const CreateItemGroupRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Item group name is required").max(100),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateItemGroupRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item Group ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Item group name cannot be empty").max(100).optional(),
    code: z.string().trim().max(30).optional(),
    description: z.string().trim().max(250).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeleteItemGroupRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Item Group ID"),
  }),
});
