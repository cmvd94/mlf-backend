import "reflect-metadata";
import { z, ZodSchema } from "zod";

export const META_VALIDATION_SCHEMA = "validation_schema";
export type ValidationTarget = "body" | "query" | "params" | "headers";

export function ValidateSchema(schemaObj: z.ZodObject<any>) {
  return (target: any, propertyKey: string) => {
    const shape = schemaObj.shape;
    const parsedSchemas: Partial<Record<ValidationTarget, ZodSchema>> = {};
    const targets: ValidationTarget[] = ["body", "query", "params", "headers"];

    for (const target of targets) {
      if (shape[target]) {
        parsedSchemas[target] = shape[target];
      }
    }

    Reflect.defineMetadata(
      META_VALIDATION_SCHEMA,
      parsedSchemas,
      target,
      propertyKey
    );
  };
}
