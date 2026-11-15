import { cleanEnv, port, str } from "envalid";
import { Environment } from "../constants/environment";

export const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str({
      choices: [
        Environment.PRODUCTION,
        Environment.DEVELOPMENT,
        Environment.TEST,
      ],
      default: Environment.DEVELOPMENT,
    }),
    PORT: port({ default: 3500 }),
    LOG_DIR: str({ default: "logs" }),
    MONGO_URI: str({ default: "mongodb://localhost:27017/mlf" }),
    MONGO_DB_NAME: str({ default: "mlf" }),
    JWT_SECRET: str({ default: "mlf-secret-token-key-2026" }),
  });
};
