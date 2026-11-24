import { z } from "zod";

export const UpdateGodownIsActiveRouteSchema = z.object({
  body: z.object({
    godownIds: z
      .array(
        z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID format")
      )
      .min(1, "At least one godown ID must be provided"),
    isActive: z.boolean(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
