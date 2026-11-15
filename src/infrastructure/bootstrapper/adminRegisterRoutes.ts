import express, { RequestHandler } from "express";
import { resolveAdminMiddleware } from "./resolveAdminMiddleware";
import { RouteDefinition } from "@/application/decorators/types";
import { buildHandlerWithDecorators } from "./buildHandlerWithDecorator";
import { META_BASE_PATH } from "@/application/decorators/basePath";
import { META_ROUTES } from "@/application/decorators/Route";

export function adminRegisterRoute(
  app: express.Application,
  controllerInstances: any[]
) {
  for (const instance of controllerInstances) {
    const Controller = instance.constructor;
    const basePath: string = Reflect.getMetadata(META_BASE_PATH, Controller);
    const routes: RouteDefinition[] =
      Reflect.getMetadata(META_ROUTES, Controller) || [];

    routes.forEach(({ method, path, handlerName }) => {
      const handlerWithParams = buildHandlerWithDecorators(
        instance,
        handlerName
      );

      const middlewares: RequestHandler[] = resolveAdminMiddleware(
        instance,
        handlerName
      );

      (app as any)[method](
        basePath + path,
        ...middlewares,
        handlerWithParams
      );
    });
  }
}
