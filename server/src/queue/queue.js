/**
 * Resilient Job Queue Engine.
 *
 * Supports:
 *   1. In-process queue (Default: NO Redis, NO Docker required)
 *   2. Optional BullMQ queue (Only when REDIS_URL is explicitly configured)
 *
 * Handles job types:
 *   - 'process-source': PDF extraction, image understanding, link scraping
 *   - 'research-business': Web research using Tavily/Gemini
 *   - 'generate-website': AI website generation
 *   - 'regenerate-section': Single section regeneration
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { GenerationJob } from '../models/index.js';

// Lazy reference to BullMQ to avoid connecting to Redis on import
let bullQueues = null;

const hasRedis = Boolean(
  config.redis?.url &&
  config.redis.url !== 'none' &&
  !config.redis.url.includes('dummy') &&
  process.env.USE_REDIS === 'true'
);

/**
 * In-process job runner.
 * Dispatches background work asynchronously without blocking HTTP responses.
 */
async function runInProcessJob(jobType, data, jobDocId = null) {
  logger.info(`[InProcessQueue] Starting job '${jobType}' (jobDocId=${jobDocId || 'none'})`);

  // Let the current event loop turn complete before running the task
  setImmediate(async () => {
    try {
      if (jobType === 'process-source') {
        const { processSourceRecord } = await import('../workers/sourceWorker.js');
        await processSourceRecord(data.sourceId);
      } else if (jobType === 'research-business') {
        const { executeBusinessResearch } = await import('../modules/research/research.controller.js');
        await executeBusinessResearch(data.projectId, jobDocId || data.jobId);
      } else if (jobType === 'generate-website') {
        const { executeWebsiteGeneration } = await import('../modules/generation/generation.controller.js');
        await executeWebsiteGeneration(data.projectId, jobDocId || data.jobId, {
          manualOnly: Boolean(data.manualOnly),
        });
      } else {
        logger.warn(`[InProcessQueue] Unrecognized job type: ${jobType}`);
      }

      if (jobDocId) {
        await GenerationJob.findByIdAndUpdate(jobDocId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        });
      }
    } catch (err) {
      logger.error(`[InProcessQueue] Job '${jobType}' failed:`, err.message);
      if (jobDocId) {
        await GenerationJob.findByIdAndUpdate(jobDocId, {
          status: 'failed',
          error: err.message,
          completedAt: new Date(),
        });
      }
    }
  });
}

/**
 * Universal job dispatcher.
 * If Redis is not used, runs completely in-process using Node.js event loop.
 */
export async function addJob(queueName, jobType, data, options = {}) {
  // If Redis is explicitly enabled, try BullMQ
  if (hasRedis) {
    try {
      if (!bullQueues) {
        const { Queue } = await import('bullmq');
        const conn = { url: config.redis.url };
        bullQueues = {
          'source-processing': new Queue('source-processing', { connection: conn }),
          research: new Queue('research', { connection: conn }),
          generation: new Queue('generation', { connection: conn }),
          publish: new Queue('publish', { connection: conn }),
        };
      }

      const q = bullQueues[queueName];
      if (q) {
        const job = await q.add(jobType, data, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          ...options,
        });
        logger.info(`[BullMQ] Added job '${jobType}' (id=${job.id}) to queue '${queueName}'`);
        return job.id;
      }
    } catch (bullErr) {
      logger.warn(`[BullMQ] Redis unavailable (${bullErr.message}). Falling back to in-process execution.`);
    }
  }

  // Fallback: In-process asynchronous execution
  const generatedId = `inproc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await runInProcessJob(jobType, data, data.jobId || null);
  return generatedId;
}

// Named queue abstractions (noop placeholders for controller compatibility)
export const sourceQueue = 'source-processing';
export const researchQueue = 'research';
export const generationQueue = 'generation';
export const publishQueue = 'publish';
