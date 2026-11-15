import "reflect-metadata";

export const META_BASE_PATH = "basePath";

export function BasePath(path: string) {
  return function (target: any) {
    Reflect.defineMetadata(META_BASE_PATH, path, target);
  };
}
