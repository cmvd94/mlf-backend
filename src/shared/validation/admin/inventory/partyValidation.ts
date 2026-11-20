import { z } from "zod";

export const CreatePartyRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Party name is required").max(120),
    partyCode: z.string().trim().max(50).optional(),
    contactPerson: z.string().trim().max(100).optional(),
    phoneNumber: z.string().trim().max(20).optional(),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    address: z.string().trim().max(300).optional(),
    gstin: z.string().trim().max(30).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdatePartyRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Party name cannot be empty").max(120).optional(),
    partyCode: z.string().trim().max(50).optional(),
    contactPerson: z.string().trim().max(100).optional(),
    phoneNumber: z.string().trim().max(20).optional(),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    address: z.string().trim().max(300).optional(),
    gstin: z.string().trim().max(30).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const DeletePartyRouteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Party ID"),
  }),
});
