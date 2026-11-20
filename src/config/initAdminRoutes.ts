import { adminRegisterRoute } from "@/infrastructure/bootstrapper/adminRegisterRoutes";
import { Application } from "express";
import {
  crudAdminController,
  adminAuthController,
  adminStaticDataController,
  godownController,
  accountInventoryController,
  purchaseController,
  stockSummaryController,
} from "./di/initResolveDependencies";

export const initAdminRoutes = (app: Application) => {
  adminRegisterRoute(app, [
    adminAuthController,
    crudAdminController,
    adminStaticDataController,
    godownController,
    accountInventoryController,
    purchaseController,
    stockSummaryController,
  ]);
};
