import { injectable, inject } from "tsyringe";
import { Logger } from "winston";
import express from "express";
import { InitializeOnStartup } from "./config/common/initializeOnStartup";

@injectable()
export class App {
  public app: express.Application;
  private port: number;

  constructor(
    @inject("ExpressApp") private expressApp: express.Application,
    @inject("CommonLogger") private logger: Logger,
    @inject("InitializeMiddlewares")
    private initMiddlewares: (app: express.Application) => void,
    @inject("InitializeRoutes")
    private initRoutes: (app: express.Application) => void,
    @inject("InitializeErrorHandling")
    private initErrorHandling: (
      app: express.Application,
      logger: Logger
    ) => void,
    @inject(InitializeOnStartup)
    private initializeOnStartup: InitializeOnStartup
  ) {
    this.app = expressApp;
    this.port = parseInt(process.env.PORT || "3500");
    this.setup();
  }

  private async setup() {
    this.initMiddlewares(this.app);
    this.initRoutes(this.app);
    this.initErrorHandling(this.app, this.logger);
    await this.initializeOnStartup.initialize();
  }

  public getServer() {
    return this.app;
  }

  public listen() {
    return this.app.listen(this.port, () => {
      this.logger.info(`=================================`);
      this.logger.info(`🚀 MLF Backend listening on port ${this.port}`);
      this.logger.info(`=================================`);
    });
  }
}
