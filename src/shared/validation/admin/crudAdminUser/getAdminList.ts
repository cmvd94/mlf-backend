import { z } from "zod";
import { AdminRole } from "@/shared/constants/adminRole";

export const GetAdminUserListRouteSchema = z.object({
  query: z.object({
    role: z.nativeEnum(AdminRole).optional(),
    isActive: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(10),
  }),
  headers: z.object({}).passthrough().optional(),
});
