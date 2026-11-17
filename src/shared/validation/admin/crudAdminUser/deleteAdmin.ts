import { z } from "zod";

export const DeleteAdminRouteSchema = z.object({
  params: z.object({
    userId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Invalid user ID format"),
  }),
});
