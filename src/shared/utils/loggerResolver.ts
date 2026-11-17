import { adminLogger, commonLogger } from "@/infrastructure/logger";
import { Logger } from "winston";

const loggerMatchers: { pattern: RegExp; logger: Logger }[] = [
  { pattern: /^\/admin/, logger: adminLogger },
];

export const resolveLogger = (reqPath: string): Logger => {
  const match = loggerMatchers.find(({ pattern }) => pattern.test(reqPath));
  return match ? match.logger : commonLogger;
};
