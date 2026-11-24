import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3000,
    });
    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  } catch (error) {
    logger.warn(`[Database] MongoDB connection failed (${error.message}). Running server without active database connection.`);
  }
}
