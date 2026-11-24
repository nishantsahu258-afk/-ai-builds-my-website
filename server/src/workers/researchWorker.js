import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { executeBusinessResearch } from '../modules/research/research.controller.js';

if (process.env.USE_REDIS === 'true') {
  import('bullmq').then(({ Worker }) => {
    const connection = { url: config.redis.url };
    const researchWorker = new Worker(
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
  }).catch(() => {});
}
