import {
  META_IS_ADMIN_AUTHENTICATED,
  META_ADMIN_ROLE_GUARD,
} from "@/application/decorators/adminDefineMetadata";
import { META_VALIDATION_SCHEMA } from "@/application/decorators/validateSchemaDefineMetadata";
import { adminRoleGuard } from "@/interfaces/middleware/admin/adminRouteGuard";
import { isAdminAuthenticated } from "@/interfaces/middleware/admin/isAdminAuthenticated";
import { validateRequestSchema } from "@/interfaces/middleware/validateRequestSchema";
import { RequestHandler } from "express";

export function resolveAdminMiddleware(
  controllerInstance: any,
  methodName: string
): RequestHandler[] {
  const middlewares: RequestHandler[] = [];

  const schemaMeta = Reflect.getMetadata(
    META_VALIDATION_SCHEMA,
    controllerInstance,
    methodName
  );
  if (schemaMeta) {
    const { body, query, params, headers } = schemaMeta;
    middlewares.push(validateRequestSchema({ body, query, params, headers }));
  }

  const isProtected = Reflect.getMetadata(
    META_IS_ADMIN_AUTHENTICATED,
    controllerInstance,
    methodName
  );
  if (isProtected) {
    middlewares.push(isAdminAuthenticated);
  }

  const allowedRoles: string[] = Reflect.getMetadata(
    META_ADMIN_ROLE_GUARD,
    controllerInstance,
    methodName
  );
  if (allowedRoles && allowedRoles.length > 0) {
    middlewares.push(adminRoleGuard(allowedRoles));
  }

  return middlewares;
}
