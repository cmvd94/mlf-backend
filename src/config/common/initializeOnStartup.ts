import { inject, injectable } from "tsyringe";
import { Logger } from "winston";

@injectable()
export class InitializeOnStartup {
  constructor(
    @inject("CommonLogger")
    private logger: Logger
  ) {}

  public async initialize() {
    this.logger.info("Starting server initialization tasks...");
    this.logger.info("Server initialization tasks completed.");
  }
}
