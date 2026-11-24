import { Project } from '../../models/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Ownership middleware for project routes.
 *
 * Loads the project by :id, verifies it belongs to the authenticated user,
 * and attaches it to req.project so downstream handlers can use it directly.
 *
 * Usage:
 *   router.get('/:id', authenticate, checkProjectOwnership, getProject)
 */
const checkProjectOwnership = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      deleted: { $ne: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    req.project = project;
    next();
  } catch (err) {
    // Invalid ObjectId format → treat as not found
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    logger.error('[checkProjectOwnership]', err);
    next(err);
  }
};

export default checkProjectOwnership;
