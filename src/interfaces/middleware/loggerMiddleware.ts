import morgan from "morgan";
import { Logger } from "winston";
import { adminLogger, commonLogger } from "@/infrastructure/logger";

const createMorganStream = (logger: Logger) => ({
  write: (message: string) => {
    logger.info(message.trim());
  },
});

export const adminRequestLogger = morgan("combined", {
  stream: createMorganStream(adminLogger),
});

export const commonRequestLogger = morgan("combined", {
  stream: createMorganStream(commonLogger),
});
