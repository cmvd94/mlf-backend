import { Application, ErrorRequestHandler, RequestHandler } from "express";
import errorMiddleware from "@/interfaces/middleware/errorMiddleware";
import { Logger } from "winston";
import notFoundMiddleware from "@/interfaces/middleware/notFoundMiddleware";

export const initializeErrorHandling = (app: Application, logger: Logger) => {
  app.use(notFoundMiddleware as RequestHandler);
  app.use(errorMiddleware(logger) as ErrorRequestHandler);
};
