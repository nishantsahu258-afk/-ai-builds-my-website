import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// Ensure SRV DNS resolution succeeds across Windows DNS resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Use default OS resolver if setServers fails
}

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('[Database] MongoDB connected successfully to database');

    mongoose.connection.on('error', (err) => logger.error('[Database] MongoDB runtime error:', err.message));
    mongoose.connection.on('disconnected', () => logger.warn('[Database] MongoDB disconnected'));
  } catch (error) {
    if (error.message?.includes('authentication failed') || error.code === 8000) {
      logger.error('[Database] MongoDB Atlas authentication failed: Invalid username or password in MONGODB_URI.');
    } else {
      logger.warn(`[Database] MongoDB connection failed (${error.message}). Running server with in-process resilience.`);
    }
  }
}
