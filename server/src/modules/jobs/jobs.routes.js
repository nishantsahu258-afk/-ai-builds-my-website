import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import { getJobStatus, listProjectJobs } from './jobs.controller.js';

const router = Router();

router.get('/jobs/:jobId', authenticate, getJobStatus);
router.get('/projects/:id/jobs', authenticate, checkProjectOwnership, listProjectJobs);

export default router;
