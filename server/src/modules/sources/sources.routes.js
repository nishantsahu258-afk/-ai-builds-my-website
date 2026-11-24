import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import validate from '../../middleware/validate.js';
import multerUpload from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { addLinkSchema } from '../../validators/sources.validator.js';
import {
  addFileSource,
  addLinkSource,
  listSources,
  deleteSource,
} from './sources.controller.js';

const router = Router();

router.post(
  '/projects/:id/sources/files',
  authenticate,
  checkProjectOwnership,
  uploadLimiter,
  multerUpload.single('file'),
  addFileSource
);

router.post(
  '/projects/:id/sources/links',
  authenticate,
  checkProjectOwnership,
  validate(addLinkSchema),
  addLinkSource
);

router.get(
  '/projects/:id/sources',
  authenticate,
  checkProjectOwnership,
  listSources
);

router.delete(
  '/sources/:sourceId',
  authenticate,
  deleteSource
);

export default router;
