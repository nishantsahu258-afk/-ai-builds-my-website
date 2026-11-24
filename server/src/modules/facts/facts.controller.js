import { Fact, Project } from '../../models/index.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /projects/:id/facts
 * Returns facts sorted by status priority: conflict -> unverified -> confirmed -> rejected
 */
export async function listFacts(req, res, next) {
  try {
    const projectId = req.project._id;

    const facts = await Fact.find({ projectId }).lean();

    // Sort order: conflict = 0, unverified = 1, missing = 2, confirmed = 3, rejected = 4
    const statusOrder = {
      conflict: 0,
      unverified: 1,
      missing: 2,
      confirmed: 3,
      rejected: 4,
    };

    facts.sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      return orderA - orderB;
    });

    return success(res, { facts }, 'Facts retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to verify fact ownership via project.ownerId
 */
async function verifyFactOwnership(factId, userId) {
  const fact = await Fact.findById(factId);
  if (!fact) return { fact: null, allowed: false, notFound: true };

  const project = await Project.findOne({ _id: fact.projectId, ownerId: userId });
  if (!project) return { fact, allowed: false, notFound: false };

  return { fact, allowed: true, notFound: false };
}

/**
 * PATCH /facts/:factId
 * Edit candidate or current selectedValue
 */
export async function updateFact(req, res, next) {
  try {
    const { factId } = req.params;
    const { selectedValue, status } = req.body;

    const { fact, allowed, notFound } = await verifyFactOwnership(factId, req.user.id);
    if (notFound) return error(res, 'Fact not found', 404);
    if (!allowed) return error(res, 'Forbidden: you do not own this resource', 403);

    if (selectedValue !== undefined) {
      fact.selectedValue = selectedValue;
    }
    if (status !== undefined) {
      fact.status = status;
    }

    await fact.save();
    return success(res, { fact }, 'Fact updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /facts/:factId/confirm
 * Explicit user confirmation of fact value
 */
export async function confirmFact(req, res, next) {
  try {
    const { factId } = req.params;
    const { value } = req.body;

    const { fact, allowed, notFound } = await verifyFactOwnership(factId, req.user.id);
    if (notFound) return error(res, 'Fact not found', 404);
    if (!allowed) return error(res, 'Forbidden: you do not own this resource', 403);

    if (value !== undefined) {
      fact.selectedValue = value;
    }

    fact.status = 'confirmed';
    fact.confirmedBy = req.user.id;
    fact.confirmedAt = new Date();

    await fact.save();
    logger.info(`[Facts] Fact ${fact.key} confirmed for project ${fact.projectId}`);

    return success(res, { fact }, 'Fact confirmed successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /facts/:factId/reject
 */
export async function rejectFact(req, res, next) {
  try {
    const { factId } = req.params;

    const { fact, allowed, notFound } = await verifyFactOwnership(factId, req.user.id);
    if (notFound) return error(res, 'Fact not found', 404);
    if (!allowed) return error(res, 'Forbidden: you do not own this resource', 403);

    fact.status = 'rejected';
    await fact.save();

    logger.info(`[Facts] Fact ${fact.key} rejected for project ${fact.projectId}`);
    return success(res, { fact }, 'Fact rejected');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /projects/:id/facts/manual
 * Add a fact manually with immediate confirmed status
 */
export async function addManualFact(req, res, next) {
  try {
    const projectId = req.project._id;
    const { key, value } = req.body;

    if (!key || value === undefined || value === null || value === '') {
      return error(res, 'Key and value are required', 400);
    }

    const candidate = {
      value,
      extractionMethod: 'manual',
      evidenceExcerpt: 'Manually entered by business owner',
      extractedAt: new Date(),
    };

    let fact = await Fact.findOne({ projectId, key });
    if (fact) {
      fact.candidates.push(candidate);
      fact.selectedValue = value;
      fact.status = 'confirmed';
      fact.confirmedBy = req.user.id;
      fact.confirmedAt = new Date();
      await fact.save();
    } else {
      fact = await Fact.create({
        projectId,
        key,
        candidates: [candidate],
        selectedValue: value,
        status: 'confirmed',
        confirmedBy: req.user.id,
        confirmedAt: new Date(),
      });
    }

    return success(res, { fact }, 'Fact added and confirmed successfully', 201);
  } catch (err) {
    next(err);
  }
}
