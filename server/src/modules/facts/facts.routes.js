import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { checkProjectOwnership } from '../../middleware/ownership.js';
import {
  listFacts,
  updateFact,
  confirmFact,
  rejectFact,
  addManualFact,
} from './facts.controller.js';

const router = Router();

router.get('/projects/:id/facts', authenticate, checkProjectOwnership, listFacts);
router.post('/projects/:id/facts/manual', authenticate, checkProjectOwnership, addManualFact);
router.patch('/facts/:factId', authenticate, updateFact);
router.post('/facts/:factId/confirm', authenticate, confirmFact);
router.post('/facts/:factId/reject', authenticate, rejectFact);

export default router;
