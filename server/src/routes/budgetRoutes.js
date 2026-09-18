import { Router } from 'express';
import {
  getMonthPlans,
  getMonthPlan,
  upsertMonthPlan,
} from '../controllers/budgetController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/month-plans', getMonthPlans);
router.get('/month-plans/:month', getMonthPlan);
router.put('/month-plans/:month', upsertMonthPlan);

export default router;
