import { Request, Response, NextFunction } from "express";

export function buildHandlerWithDecorators(
  controllerInstance: any,
  methodName: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paramTypes: any[] =
      Reflect.getMetadata(
        "design:paramtypes",
        controllerInstance,
        methodName
      ) || [];
    const args: any[] = [];

    for (let i = 0; i < paramTypes.length; i++) {
      if (Reflect.getMetadata(`body:${methodName}:${i}`, controllerInstance)) {
        args[i] = req.body;
      } else if (
        Reflect.getMetadata(`params:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = req.params;
      } else if (
        Reflect.getMetadata(`query:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = req.query;
      } else if (
        Reflect.getMetadata(`headers:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = req.headers;
      } else if (
        Reflect.getMetadata(`admin:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = (req as any).admin;
      } else if (
        Reflect.getMetadata(`req:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = req;
      } else if (
        Reflect.getMetadata(`res:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = res;
      } else if (
        Reflect.getMetadata(`next:${methodName}:${i}`, controllerInstance)
      ) {
        args[i] = next;
      } else {
        args[i] = undefined;
      }
    }

    return controllerInstance[methodName](...args);
  };
}
