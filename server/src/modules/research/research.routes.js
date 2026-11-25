import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { startResearch, getResearchStatus } from './research.controller.js';

const router = Router();

// aiLimiter guards Gemini/Tavily-calling routes independently of the general apiLimiter
router.post('/projects/:id/research', authenticate, checkProjectOwnership, aiLimiter, startResearch);
router.get('/projects/:id/research-status', authenticate, checkProjectOwnership, getResearchStatus);

export default router;

