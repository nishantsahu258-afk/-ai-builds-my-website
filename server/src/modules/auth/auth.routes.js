import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter.js';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { registerSchema, loginSchema } from '../../validators/auth.validator.js';
import { register, login, logout, getMe } from './auth.controller.js';

const router = Router();

// POST /auth/register
router.post('/register', authLimiter, validate(registerSchema), register);

// POST /auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /auth/logout  (must be authenticated to log out cleanly)
router.post('/logout', authenticate, logout);

// GET /auth/me
router.get('/me', authenticate, getMe);

export default router;
