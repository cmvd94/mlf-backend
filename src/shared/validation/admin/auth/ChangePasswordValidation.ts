import { z } from "zod";

export const ChangePasswordRouteSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string()
        .min(6, "Current password must be at least 6 characters"),
      newPassword: z
        .string()
        .min(6, "New password must be at least 6 characters"),
      confirmPassword: z
        .string()
        .min(6, "Confirm password must be at least 6 characters"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "New password and confirm password must match",
      path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});

export type ChangePasswordDTO = z.infer<
  typeof ChangePasswordRouteSchema.shape.body
>;
