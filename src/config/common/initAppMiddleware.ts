import express from "express";
import cors from "cors";
import i18n from "@/config/i18n";
import { setLanguage } from "@/interfaces/middleware/languageMiddleware";
import {
  adminRequestLogger,
  commonRequestLogger,
} from "@/interfaces/middleware/loggerMiddleware";

export const initializeMiddlewares = (app: express.Application) => {
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    })
  );

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    })
  );

  app.use(i18n.init);
  app.use(setLanguage);

  app.use("/admin", adminRequestLogger);
  app.use(commonRequestLogger);
};
