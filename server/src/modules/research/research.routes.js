import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import { startResearch, getResearchStatus } from './research.controller.js';

const router = Router();

router.post('/projects/:id/research', authenticate, checkProjectOwnership, startResearch);
router.get('/projects/:id/research-status', authenticate, checkProjectOwnership, getResearchStatus);

export default router;
