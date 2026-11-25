import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { generateWebsite } from './generation.controller.js';

const router = Router();

// aiLimiter guards Gemini-calling routes independently of the general apiLimiter
router.post('/projects/:id/generate', authenticate, checkProjectOwnership, aiLimiter, generateWebsite);

export default router;
