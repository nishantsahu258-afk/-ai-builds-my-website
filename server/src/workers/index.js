import '../config/index.js';
import { connectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import './sourceWorker.js';
import './researchWorker.js';
import './generationWorker.js';

async function startWorkers() {
  await connectDatabase();
  logger.info('[Workers] All background workers successfully initialized and listening');
}

startWorkers().catch((err) => {
  console.error('[Workers] Failed to start workers:', err);
  process.exit(1);
});
