import "reflect-metadata";

export const Body =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `body:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Params =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `params:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Query =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `query:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Headers =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `headers:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const ReqAdmin =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `admin:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Req =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `req:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Res =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `res:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };

export const Next =
  () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(
      `next:${String(propertyKey)}:${parameterIndex}`,
      true,
      target
    );
  };
