import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// Lower buffer timeout so it fails immediately instead of hanging 10s if disconnected
mongoose.set('bufferTimeoutMS', 2000);

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
    });
    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Utilizing local persistence store.');
    });
  } catch (error) {
    mongoose.set('bufferCommands', false);
    logger.warn(`[Database] MongoDB connection unavailable (${error.message}). Utilizing local persistence store.`);
  }
}
