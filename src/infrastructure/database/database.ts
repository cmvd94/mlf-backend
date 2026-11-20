import mongoose from "mongoose";
import dotenv from "dotenv";
import { commonLogger } from "@/infrastructure/logger";
import { Environment } from "@/shared/constants/environment";
import { Logger } from "winston";
import { AdminModel } from "@/domain/entities/admin/Admin";
import { AdminSessionModel } from "@/domain/entities/admin/AdminSession";
import { CounterModel } from "@/domain/entities/common/Counter";
import { PartyModel } from "@/domain/entities/admin/Party";
import { PurchaseTypeModel } from "@/domain/entities/admin/PurchaseType";
import { UnitOfMeasurementModel } from "@/domain/entities/admin/UnitOfMeasurement";
import { PerUnitModel } from "@/domain/entities/admin/PerUnit";
import { ItemGroupModel } from "@/domain/entities/admin/ItemGroup";
import { ItemModel } from "@/domain/entities/admin/Item";
import { PurchaseModel } from "@/domain/entities/admin/Purchase";
import { GodownModel } from "@/domain/entities/admin/Godown";
import { GodownStockModel } from "@/domain/entities/admin/GodownStock";

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

      const modelsToSync = [
        AdminModel,
        AdminSessionModel,
        CounterModel,
        PartyModel,
        PurchaseTypeModel,
        UnitOfMeasurementModel,
        PerUnitModel,
        ItemGroupModel,
        ItemModel,
        PurchaseModel,
        GodownModel,
        GodownStockModel,
      ];

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
          if (error?.code === 86 || error?.codeName === "IndexKeySpecsConflict") {
            logger.warn(
              `IndexKeySpecsConflict detected for model ${model.modelName}. Re-syncing indexes...`
            );
            try {
              const indexes = await model.collection.indexes();
              for (const idx of indexes) {
                if (idx.name && idx.name !== "_id_") {
                  try {
                    await model.collection.dropIndex(idx.name);
                    logger.info(
                      `Dropped conflicting index ${idx.name} on ${model.modelName}`
                    );
                  } catch (dropErr: any) {
                    logger.warn(
                      `Could not drop index ${idx.name} on ${model.modelName}: ${dropErr?.message}`
                    );
                  }
                }
              }
              await model.syncIndexes();
              continue;
            } catch (retryError) {
              logger.error(
                `Failed to re-sync indexes for ${model.modelName}:`,
                retryError
              );
              throw retryError;
            }
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
