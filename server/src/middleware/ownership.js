import mongoose from 'mongoose';

/**
 * Middleware factory that returns an ownership-check middleware for a given
 * Mongoose model. Fetches the document, confirms the owner, and attaches it
 * to req under the given key.
 *
 * @param {string} modelName       - Registered Mongoose model name (e.g. 'Project')
 * @param {string} paramName       - req.params key holding the document id
 * @param {string} attachKey       - Key to attach the document to on req (e.g. 'project')
 * @returns {import('express').RequestHandler}
 */
const ownershipMiddleware = (modelName, paramName, attachKey) => async (req, res, next) => {
  try {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const Model = mongoose.model(modelName);
    const doc = await Model.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    if (doc.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: you do not own this resource' });
    }

    req[attachKey] = doc;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Fetches a Project by req.params.id or req.params.projectId,
 * verifies ownership, and attaches it to req.project.
 */
export const checkProjectOwnership = (req, res, next) => {
  const paramName = req.params.projectId ? 'projectId' : 'id';
  return ownershipMiddleware('Project', paramName, 'project')(req, res, next);
};

/**
 * Fetches a Website by req.params.websiteId or req.params.id,
 * verifies ownership, and attaches it to req.website.
 */
export const checkWebsiteOwnership = (req, res, next) => {
  const paramName = req.params.websiteId ? 'websiteId' : 'id';
  return ownershipMiddleware('Website', paramName, 'website')(req, res, next);
};
