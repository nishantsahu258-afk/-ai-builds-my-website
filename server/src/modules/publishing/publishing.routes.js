import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkWebsiteOwnership } from '../../middleware/ownership.js';
import {
  publishWebsite,
  unpublishWebsite,
  getVersions,
  getPublicSite,
} from './publishing.controller.js';

const router = Router();

// Protected routes
router.post('/websites/:id/publish', authenticate, checkWebsiteOwnership, publishWebsite);
router.post('/websites/:id/unpublish', authenticate, checkWebsiteOwnership, unpublishWebsite);
router.get('/websites/:id/versions', authenticate, checkWebsiteOwnership, getVersions);

// Public route (unauthenticated)
router.get('/public/sites/:slug', getPublicSite);

export default router;
