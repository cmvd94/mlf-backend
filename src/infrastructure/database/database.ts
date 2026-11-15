import mongoose from "mongoose";
import dotenv from "dotenv";
import { commonLogger } from "@/infrastructure/logger";
import { Environment } from "@/shared/constants/environment";
import { Logger } from "winston";
import { AdminModel } from "@/domain/entities/admin/Admin";
import { AdminSessionModel } from "@/domain/entities/admin/AdminSession";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mlf";

export const connectDB = async (logger: Logger) => {
  try {
    const isProductionEnv = process.env.NODE_ENV === Environment.PRODUCTION;

    mongoose.set("autoIndex", !isProductionEnv);
    mongoose.set("autoCreate", !isProductionEnv);

    await mongoose.connect(MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "mlf",
    });
    logger.info("MongoDB Connected Successfully");

    if (!isProductionEnv) {
      logger.info("Syncing indexes...");

      const modelsToSync = [AdminModel, AdminSessionModel];

      for (const model of modelsToSync) {
        try {
          await model.syncIndexes();
        } catch (error: any) {
          if (error?.code === 27 || error?.codeName === "IndexNotFound") {
            logger.warn(
              `Skipping stale index cleanup race for model ${model.modelName}: ${
                error?.message || "Index not found"
              }`
            );
            continue;
          }
          throw error;
        }
      }

      logger.info("Indexes Synced Successfully");
    }
  } catch (error) {
    logger.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};
