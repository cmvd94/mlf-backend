import { z } from "zod";
import { AdminRole } from "@/shared/constants/adminRole";
import { Language } from "@/shared/constants/locale";

export const UpdateAdminUserRouteSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      email: z.string().trim().email("Email must be valid").max(100).optional(),
      phoneNumber: z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Phone number must be 10 digits")
        .optional(),
      role: z.nativeEnum(AdminRole).optional(),
      employeeId: z.string().trim().optional(),
      language: z.nativeEnum(Language).optional(),
    })
    .superRefine((data, ctx) => {
      if ("phoneNumber" in data) {
        ctx.addIssue({
          path: ["phoneNumber"],
          code: z.ZodIssueCode.custom,
          message: "Phone number cannot be changed",
        });
      }
    }),
  params: z.object({
    userId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Invalid user ID format"),
  }),
  query: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
