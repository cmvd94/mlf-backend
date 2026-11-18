import { z } from "zod";
import { GodownType } from "@/domain/entities/admin/Godown";

export const GetGodownListRouteSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    type: z.nativeEnum(GodownType).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    country: z.string().trim().optional(),
    zone: z.string().trim().optional(),
    state: z.string().trim().optional(),
    district: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
