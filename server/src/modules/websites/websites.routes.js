import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkWebsiteOwnership } from '../../middleware/ownership.js';
import {
  getWebsite,
  updateWebsiteTheme,
  updateSection,
  regenerateSection,
  toggleSectionVisibility,
  reorderSections,
} from './websites.controller.js';

const router = Router();

router.get('/websites/:id', authenticate, checkWebsiteOwnership, getWebsite);
router.patch('/websites/:id', authenticate, checkWebsiteOwnership, updateWebsiteTheme);
router.patch('/websites/:id/sections/:sectionId', authenticate, checkWebsiteOwnership, updateSection);
router.post(
  '/websites/:id/sections/:sectionId/regenerate',
  authenticate,
  checkWebsiteOwnership,
  regenerateSection
);
router.patch(
  '/websites/:id/sections/:sectionId/toggle',
  authenticate,
  checkWebsiteOwnership,
  toggleSectionVisibility
);
router.patch('/websites/:id/reorder', authenticate, checkWebsiteOwnership, reorderSections);

export default router;
