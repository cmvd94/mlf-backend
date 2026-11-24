import { z } from "zod";

export const GetAGodownRouteSchema = z.object({
  params: z.object({
    id: z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID"),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
