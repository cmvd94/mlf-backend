import { z } from "zod";

export const AdminLoginRouteSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Phone number must be 10 digits"),
    password: z.string().min(1, "Password is required"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});

export type AdminLoginDTO = z.infer<typeof AdminLoginRouteSchema.shape.body>;
