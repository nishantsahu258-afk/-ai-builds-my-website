import dns from "dns";
import mongoose from "mongoose";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";

// Set reliable public DNS servers for Node.js SRV resolution on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Use default OS resolver
}

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info("[Database] MongoDB connected successfully to database");

    mongoose.connection.on("error", (err) =>
      logger.error("[Database] MongoDB runtime error:", err.message),
    );
    mongoose.connection.on("disconnected", () =>
      logger.warn("[Database] MongoDB disconnected"),
    );
  } catch (error) {
    if (
      error.message?.includes("authentication failed") ||
      error.code === 8000
    ) {
      logger.error(
        "[Database] MongoDB Atlas authentication failed: Invalid username or password in MONGODB_URI.",
      );
    } else {
      logger.error(
        `[Database] MongoDB connection failed (${error.message}). Server will exit.`,
      );
    }
    // Re-throw the error to abort startup when Atlas connection fails
    throw error;
  }
}
