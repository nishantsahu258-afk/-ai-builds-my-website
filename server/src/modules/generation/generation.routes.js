import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import { generateWebsite } from './generation.controller.js';

const router = Router();

router.post('/projects/:id/generate', authenticate, checkProjectOwnership, generateWebsite);

export default router;
