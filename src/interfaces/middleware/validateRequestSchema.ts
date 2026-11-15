import { Request, Response, NextFunction } from "express";
import { resolveLogger } from "@/shared/utils/loggerResolver";
import { ZodSchema } from "zod";
import { sendError } from "@/shared/utils/responseUtil";
import { ERROR_CODES } from "@/shared/constants/errorCodesMessages";

export type ValidationTarget = "body" | "query" | "params" | "headers";

export function validateRequestSchema(
  schemas: Partial<Record<ValidationTarget, ZodSchema>>
) {
  return function (req: Request, res: Response, next: NextFunction) {
    const logger = resolveLogger(req.path);
    const targets: ValidationTarget[] = ["body", "query", "params", "headers"];

    for (const target of targets) {
      const schema = schemas[target];
      if (schema) {
        const result = schema.safeParse(req[target]);

        if (!result.success) {
          const errorMessages = result.error.errors
            .map((e) => e.message)
            .join(", ");
          res
            .status(400)
            .json(
              sendError(
                req,
                errorMessages,
                400,
                ERROR_CODES.VALIDATION_ERROR,
                logger
              )
            );
          return;
        }

        (req as any)[target] = result.data;
      }
    }

    next();
  };
}
