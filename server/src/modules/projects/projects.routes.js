import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import validate from '../../middleware/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../../validators/projects.validator.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from './projects.controller.js';

const router = Router();

router.get('/projects', authenticate, listProjects);
router.post('/projects', authenticate, validate(createProjectSchema), createProject);
router.get('/projects/:id', authenticate, checkProjectOwnership, getProject);
router.patch(
  '/projects/:id',
  authenticate,
  checkProjectOwnership,
  validate(updateProjectSchema),
  updateProject
);
router.delete('/projects/:id', authenticate, checkProjectOwnership, deleteProject);

export default router;
