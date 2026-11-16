import { z } from "zod";
import { AdminRole } from "@/shared/constants/adminRole";
import { Language } from "@/shared/constants/locale";

export const CreateAdminUserRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    email: z.string().trim().email("Email must be valid").max(100, "Email is too long"),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Phone number must be 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.nativeEnum(AdminRole, {
      errorMap: () => ({ message: "Invalid role" }),
    }),
    employeeId: z
      .string()
      .trim()
      .regex(/^mlf_\d+$/i, "Employee ID must follow format like mlf_01")
      .optional(),
    language: z.nativeEnum(Language).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
