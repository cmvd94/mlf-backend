import { z } from "zod";
import { AdminRole } from "@/shared/constants/adminRole";

export const GetEligibleGodownAdminsRouteSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    role: z.nativeEnum(AdminRole).optional(),
    country: z.string().trim().optional(),
    zone: z.string().trim().optional(),
    state: z.string().trim().optional(),
    district: z.string().trim().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
