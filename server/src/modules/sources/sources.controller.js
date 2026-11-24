import path from 'path';
import { Source, Project, GenerationJob } from '../../models/index.js';
import { isSafeUrl } from '../../utils/ssrfProtection.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { sourceQueue, addJob } from '../../queue/queue.js';
import { getStorageService } from '../../integrations/storage/storage.service.js';

/**
 * Infer source type from MIME type.
 */
function inferTypeFromMime(mimeType) {
  if (!mimeType) return 'manual';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('msword') || mimeType.includes('officedocument')) return 'pdf';
  return 'manual';
}

/**
 * Infer link type from URL.
 */
function inferLinkType(url) {
  const lower = url.toLowerCase();
  if (lower.includes('google.com/maps') || lower.includes('maps.app.goo.gl') || lower.includes('business.google.com')) {
    return 'google_listing';
  }
  if (
    lower.includes('instagram.com') ||
    lower.includes('facebook.com') ||
    lower.includes('linkedin.com') ||
    lower.includes('twitter.com') ||
    lower.includes('x.com')
  ) {
    return 'social';
  }
  return 'website';
}

/**
 * POST /projects/:id/sources/files
 */
export async function addFileSource(req, res, next) {
  try {
    const projectId = req.project._id;
    const file = req.file;

    if (!file) {
      return error(res, 'No file uploaded', 400);
    }

    const type = inferTypeFromMime(file.mimetype);
    const storageKey = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    const source = await Source.create({
      projectId,
      type,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageKey,
      extractionStatus: 'pending',
    });

    // Try queuing BullMQ job; if Redis is down, update job status gracefully
    let jobId = null;
    try {
      jobId = await addJob(sourceQueue, 'process-source', {
        sourceId: source._id.toString(),
        projectId: projectId.toString(),
        type,
      });
    } catch (qErr) {
      logger.warn('[addFileSource] Redis/BullMQ unavailable, job queued as offline:', qErr.message);
    }

    return success(
      res,
      { source, jobId },
      'File uploaded successfully and scheduled for processing',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /projects/:id/sources/links
 */
export async function addLinkSource(req, res, next) {
  try {
    const projectId = req.project._id;
    const { url, type: explicitType } = req.body;

    const safetyCheck = isSafeUrl(url);
    if (!safetyCheck.safe) {
      return error(res, `URL is not allowed: ${safetyCheck.reason}`, 400);
    }

    const type = explicitType || inferLinkType(url);

    const source = await Source.create({
      projectId,
      type,
      url,
      extractionStatus: 'pending',
    });

    let jobId = null;
    try {
      jobId = await addJob(sourceQueue, 'process-source', {
        sourceId: source._id.toString(),
        projectId: projectId.toString(),
        type,
        url,
      });
    } catch (qErr) {
      logger.warn('[addLinkSource] Redis/BullMQ unavailable, queued as offline:', qErr.message);
    }

    return success(
      res,
      { source, jobId },
      'Link added successfully and scheduled for processing',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:id/sources
 */
export async function listSources(req, res, next) {
  try {
    const projectId = req.project._id;
    const sources = await Source.find({ projectId }).sort({ createdAt: -1 }).lean();
    return success(res, { sources }, 'Sources retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /sources/:sourceId
 */
export async function deleteSource(req, res, next) {
  try {
    const { sourceId } = req.params;
    const source = await Source.findById(sourceId);

    if (!source) {
      return error(res, 'Source not found', 404);
    }

    // Verify ownership via project
    const project = await Project.findOne({
      _id: source.projectId,
      ownerId: req.user.id,
    });

    if (!project) {
      return error(res, 'Forbidden: you do not own this resource', 403);
    }

    // Remove file if local
    if (source.storageKey) {
      const storage = getStorageService();
      try {
        await storage.deleteFile(source.storageKey);
      } catch (fErr) {
        logger.warn('[deleteSource] Could not delete physical file:', fErr.message);
      }
    }

    await Source.findByIdAndDelete(sourceId);
    return success(res, null, 'Source deleted successfully');
  } catch (err) {
    next(err);
  }
}
