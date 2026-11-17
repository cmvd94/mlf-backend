import winston from "winston";
import winstonDaily from "winston-daily-rotate-file";
import path from "path";
import { logDir } from "./loggerConfig";

const adminLogPath = path.join(logDir, "admin");
const commonLogPath = path.join(logDir, "common");

const safeStringify = (obj: any): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return `[Object with circular references - ${typeof obj}]`;
  }
};

const IST_TIMEZONE = "Asia/Kolkata";

const getISTTimestamp = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(now);
  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  const date = `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
  const time = `${lookup("hour")}:${lookup("minute")}:${lookup("second")}`;

  return `${date} ${time}`;
};

const logFormat = winston.format.printf(({ timestamp, level, message, metadata }) => {
  const meta = metadata && Object.keys(metadata).length ? safeStringify(metadata) : "";
  return `${timestamp} [${level}]: ${message} ${meta}`;
});

const createLogger = (logPath: string, level: string) =>
  winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: getISTTimestamp }),
      winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
      logFormat
    ),
    transports: [
      new winstonDaily({
        level,
        datePattern: "YYYY-MM-DD",
        dirname: logPath,
        filename: "%DATE%.log",
        maxFiles: "30d",
        zippedArchive: true,
      }),
      new winstonDaily({
        level: "error",
        datePattern: "YYYY-MM-DD",
        dirname: logPath,
        filename: "%DATE%_error.log",
        maxFiles: "30d",
        zippedArchive: true,
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.simple()
        ),
      }),
    ],
  });

const adminLogger = createLogger(adminLogPath, "debug");
const commonLogger = createLogger(commonLogPath, "debug");

export { adminLogger, commonLogger };
