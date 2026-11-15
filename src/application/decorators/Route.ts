import "reflect-metadata";
import { RouteDefinition } from "./types";

export const META_ROUTES = "routes";

export function Route(method: RouteDefinition["method"], path: string) {
  return function (target: any, propertyKey: string) {
    const routes: RouteDefinition[] =
      Reflect.getMetadata(META_ROUTES, target.constructor) || [];

    routes.push({
      method,
      path,
      handlerName: propertyKey,
    });

    Reflect.defineMetadata(META_ROUTES, routes, target.constructor);
  };
}
