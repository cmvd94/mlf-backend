import { container } from "tsyringe";
import express from "express";
import { initializeMiddlewares } from "@/config/common/initAppMiddleware";
import { initializeRoutes } from "@/config/common/initAppRouteMiddleware";
import { initializeErrorHandling } from "@/config/common/initAppErrorHandlingMiddleware";

export const initCoreDI = () => {
  const app = express();
  container.registerInstance("ExpressApp", app);

  container.register("InitializeMiddlewares", {
    useValue: initializeMiddlewares,
  });

  container.register("InitializeRoutes", {
    useValue: initializeRoutes,
  });

  container.register("InitializeErrorHandling", {
    useValue: initializeErrorHandling,
  });
};
