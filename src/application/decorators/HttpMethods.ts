import "reflect-metadata";
import { Route } from "./Route";

export function Get(path: string) {
  return Route("get", path);
}

export function Post(path: string) {
  return Route("post", path);
}

export function Put(path: string) {
  return Route("put", path);
}

export function Delete(path: string) {
  return Route("delete", path);
}

export function Patch(path: string) {
  return Route("patch", path);
}
