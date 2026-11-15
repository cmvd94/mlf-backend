import "reflect-metadata";

export const META_IS_ADMIN_AUTHENTICATED = "is_admin_authenticated";
export const META_ADMIN_ROLE_GUARD = "admin_role_guard";

export function IsAdminAuthenticated() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(META_IS_ADMIN_AUTHENTICATED, true, target, propertyKey);
  };
}

export function AdminRoleGuard(allowedRoles: string[]) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(META_ADMIN_ROLE_GUARD, allowedRoles, target, propertyKey);
  };
}
