import { z } from "zod";

export const GetStockSummaryRouteSchema = z.object({
  query: z.object({
    godownId: z
      .preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
        z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional()
      )
      .optional(),
    groupId: z
      .preprocess(
        (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
        z.string().regex(/^[a-f\d]{24}$/i, "Invalid Group ID").optional()
      )
      .optional(),
    search: z.string().trim().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    showZeroStock: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "boolean") return val;
        if (typeof val === "string") return val.toLowerCase() === "true";
        return false;
      }),
  }),
});

export const GetGroupStockSummaryRouteSchema = z.object({
  params: z.object({
    groupId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Group ID"),
  }),
  query: z.object({
    godownId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Godown ID").optional(),
    search: z.string().trim().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }),
});
