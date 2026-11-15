import { z } from "zod";

export const updateIsActiveRouteSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID")),
    isActive: z.boolean(),
  }),
});
