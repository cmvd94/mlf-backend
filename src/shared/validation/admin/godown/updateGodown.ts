import { z } from "zod";
import { GodownType } from "@/domain/entities/admin/Godown";

export const UpdateGodownRouteSchema = z.object({
  params: z.object({
    id: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Invalid godown ID format"),
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Godown name cannot be empty")
      .max(100, "Godown name is too long")
      .optional(),
    godownId: z
      .string()
      .trim()
      .min(1, "Godown ID must not be empty")
      .max(50, "Godown ID is too long")
      .optional(),
    type: z.nativeEnum(GodownType).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
    // Assigned users updates:
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
    supervisorId: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Supervisor ID format")
      )
      .optional(),
    newSupervisorIds: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Supervisor ID format")
      )
      .optional(),
    removeSupervisorIds: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Supervisor ID format")
      )
      .optional(),
    assistantId: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Assistant ID format")
      )
      .optional(),
    newAssistantIds: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Assistant ID format")
      )
      .optional(),
    removeAssistantIds: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-f\d]{24}$/i, "Invalid Assistant ID format")
      )
      .optional(),
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
  }),
  query: z.object({}).optional(),
  headers: z.object({}).passthrough().optional(),
});
