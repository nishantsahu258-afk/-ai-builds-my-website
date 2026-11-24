import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import projectRoutes from '../modules/projects/projects.routes.js';
import sourcesRoutes from '../modules/sources/sources.routes.js';
import factsRoutes from '../modules/facts/facts.routes.js';
import generationRoutes from '../modules/generation/generation.routes.js';
import researchRoutes from '../modules/research/research.routes.js';
import websiteRoutes from '../modules/websites/websites.routes.js';
import publishingRoutes from '../modules/publishing/publishing.routes.js';
import jobsRoutes from '../modules/jobs/jobs.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', projectRoutes);
router.use('/', sourcesRoutes);
router.use('/', factsRoutes);
router.use('/', generationRoutes);
router.use('/', researchRoutes);
router.use('/', websiteRoutes);
router.use('/', publishingRoutes);
router.use('/', jobsRoutes);

export default router;
