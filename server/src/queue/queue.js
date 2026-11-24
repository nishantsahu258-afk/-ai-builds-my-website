/**
 * BullMQ queue setup.
 *
 * Named queues:
 *   sourceQueue    – source document processing
 *   researchQueue  – web research jobs
 *   generationQueue – website generation jobs
 *   publishQueue   – publish/deploy jobs
 *
 * Helper:
 *   addJob(queue, jobType, data, options?) → jobId string
 */

import { Queue } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const connection = { url: config.redis.url };

export const sourceQueue = new Queue('source-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const researchQueue = new Queue('research', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const generationQueue = new Queue('generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const publishQueue = new Queue('publish', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// ---------------------------------------------------------------------------
// addJob helper
// ---------------------------------------------------------------------------

/**
 * Add a typed job to any BullMQ queue.
 *
 * @param {Queue} queue          BullMQ Queue instance
 * @param {string} jobType       Job name / type identifier
 * @param {object} data          Payload passed to the worker
 * @param {object} [options]     Additional BullMQ job options (override defaults)
 * @returns {Promise<string>}    BullMQ job ID
 */
export async function addJob(queue, jobType, data, options = {}) {
  const job = await queue.add(jobType, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    ...options,
  });

  logger.debug(`[Queue] Added job '${jobType}' (id=${job.id}) to queue '${queue.name}'`);
  return job.id;
}
