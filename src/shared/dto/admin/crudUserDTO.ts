import { z } from "zod";
import { GetAdminUserListRouteSchema } from "@/shared/validation/admin/crudAdminUser/getAdminList";
import { UpdateAdminUserRouteSchema } from "@/shared/validation/admin/crudAdminUser/updateAdmin";
import { GetAAdminRouteSchema } from "@/shared/validation/admin/crudAdminUser/getAAdmin";
import { CreateAdminUserRouteSchema } from "@/shared/validation/admin/crudAdminUser/CreateAdmin";
import { DeleteAdminRouteSchema } from "@/shared/validation/admin/crudAdminUser/deleteAdmin";
import { updateIsActiveRouteSchema } from "@/shared/validation/admin/crudAdminUser/updateIsActive";

export type CreateAdminUserDTO = z.infer<
  typeof CreateAdminUserRouteSchema.shape.body
>;

export type UpdateAdminUserDTO = z.infer<
  typeof UpdateAdminUserRouteSchema.shape.body
>;

export type UpdateAdminUserParamsDTO = z.infer<
  typeof UpdateAdminUserRouteSchema.shape.params
>;

export type GetAdminUsersFilterDTO = z.infer<
  typeof GetAdminUserListRouteSchema.shape.query
>;

export type GetAAdminDTO = z.infer<
  typeof GetAAdminRouteSchema.shape.params
>;

export type DeleteAdminDTO = z.infer<
  typeof DeleteAdminRouteSchema.shape.params
>;

export type UpdateIsActiveUserDTO = z.infer<
  typeof updateIsActiveRouteSchema.shape.body
>;
