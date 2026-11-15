import { adminRegisterRoute } from "@/infrastructure/bootstrapper/adminRegisterRoutes";
import { Application } from "express";
import { crudAdminController } from "./di/initResolveDependencies";

export const initAdminRoutes = (app: Application) => {
  adminRegisterRoute(app, [
    crudAdminController,
  ]);
};
