import { Worker } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { executeWebsiteGeneration } from '../modules/generation/generation.controller.js';

const connection = { url: config.redis.url };

export const generationWorker = new Worker(
  'generation',
  async (job) => {
    logger.info(`[generationWorker] Picked up job ${job.id}: ${job.name}`);
    const { projectId, jobId } = job.data;
    await executeWebsiteGeneration(projectId, jobId);
  },
  { connection }
);

generationWorker.on('failed', (job, err) => {
  logger.error(`[generationWorker] Job ${job?.id} failed:`, err.message);
});
