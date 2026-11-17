import { container } from "tsyringe";
import { adminLogger, commonLogger } from "@/infrastructure/logger";

export const initLoggerDI = () => {
  container.registerInstance("AdminLogger", adminLogger);
  container.registerInstance("CommonLogger", commonLogger);
};
