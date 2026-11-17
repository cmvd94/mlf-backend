import "reflect-metadata";
import "dotenv/config";
import { container } from "tsyringe";
import { connectDB } from "@/infrastructure/database/database";
import { ensureSuperAdmin } from "@/infrastructure/database/ensureSuperAdmin";
import { initCoreDI } from "./config/di/initCoreDI";
import { App } from "./app";
import { AdminRepository } from "./infrastructure/repositories/admin/AdminRepository";
import { adminLogger, commonLogger } from "./infrastructure/logger";
import { initLoggerDI } from "./config/di/initRegisterLoggerDI";
import { validateEnv } from "@/shared/utils/validataEnv";
import mongoose from "mongoose";

validateEnv();

const startServer = async () => {
  try {
    // 1. Initialize DI
    initLoggerDI();
    initCoreDI();

    // 2. Database setup
    await connectDB(commonLogger);
    await ensureSuperAdmin(
      container.resolve(AdminRepository),
      adminLogger
    );

    // 3. Resolve and start app
    const app = container.resolve(App);
    const server = app.listen();

    // 4. Graceful Shutdown
    const gracefulShutdown = (signal: string) => {
      commonLogger.info(`Received ${signal}, starting graceful shutdown...`);
      server.close(async () => {
        commonLogger.info("HTTP server closed.");
        try {
          await mongoose.connection.close();
          commonLogger.info("MongoDB connection closed.");
          process.exit(0);
        } catch (err) {
          commonLogger.error("Error during DB close:", err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        commonLogger.error("Forcefully shutting down after timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
