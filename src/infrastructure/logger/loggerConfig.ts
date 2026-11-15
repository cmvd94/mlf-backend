import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const LOG_DIR = process.env.LOG_DIR || "logs";
const logDir: string = join(__dirname, "../../../", LOG_DIR);

if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

export { logDir };
