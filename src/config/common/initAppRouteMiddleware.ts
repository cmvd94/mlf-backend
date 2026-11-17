import express from "express";
import { initAdminRoutes } from "../initAdminRoutes";

export const initializeRoutes = (app: express.Application) => {
  initAdminRoutes(app);
};
