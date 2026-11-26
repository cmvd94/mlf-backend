import { z } from "zod";
import { GodownType } from "@/domain/entities/admin/Godown";

export const CreateGodownRouteSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Godown name is required")
      .max(100, "Godown name is too long"),
    godownId: z
      .string()
      .trim()
      .min(1, "Godown ID must not be empty")
      .max(50, "Godown ID is too long")
      .optional(),
    type: z.nativeEnum(GodownType, {
      errorMap: () => ({
        message: "Type must be either 'company godown' or 'jobwork godown'",
      }),
    }),
    description: z
      .string()
      .trim()
      .max(1000, "Description is too long")
      .optional(),
    // Regional Scope / Location
    country: z.string().trim().min(1, "Country is required"),
    zone: z.string().trim().min(1, "Zone is required"),
    state: z.string().trim().min(1, "State is required"),
    district: z.string().trim().min(1, "District is required"),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Pin code must be 6 digits"),
    address: z.string().trim().max(500, "Address is too long").optional(),
    gstin: z.string().trim().max(30, "GSTIN is too long").optional(),
    phoneNumber: z.string().trim().max(20, "Phone number is too long").optional(),
    // Assigned users (all optional; not required / not allowed for jobwork godown):
    // godown manager single user
    godownManagerId: z
      .union([
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Godown Manager ID format"),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((val) => (val === "" || val === null ? null : val)),
    // SUPERVISOR []
    supervisorId: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Supervisor ID format")
      )
      .nullable()
      .optional(),
    // ASSISTANT []
    assistantId: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Assistant ID format")
      )
      .nullable()
      .optional(),
    // BILLING_USER single user
    billingUserId: z
      .union([
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Billing User ID format"),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((val) => (val === "" || val === null ? null : val)),
    isActive: z.boolean().optional().default(true),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
