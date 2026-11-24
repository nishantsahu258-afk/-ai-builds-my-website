import { Worker } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { executeBusinessResearch } from '../modules/research/research.controller.js';

const connection = { url: config.redis.url };

export const researchWorker = new Worker(
  'research',
  async (job) => {
    logger.info(`[researchWorker] Picked up job ${job.id}: ${job.name}`);
    const { projectId, jobId } = job.data;
    await executeBusinessResearch(projectId, jobId);
  },
  { connection }
);

researchWorker.on('failed', (job, err) => {
  logger.error(`[researchWorker] Job ${job?.id} failed:`, err.message);
});
