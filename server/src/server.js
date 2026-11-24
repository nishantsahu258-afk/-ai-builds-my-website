import './config/index.js'; // validates env first
import { connectDatabase } from './config/database.js';
import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

async function startServer() {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    logger.info(`Client URL: ${config.clientUrl}`);
    logger.info(`Public URL: ${config.publicBaseUrl}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      const mongoose = await import('mongoose');
      await mongoose.default.connection.close();
      logger.info('Server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
