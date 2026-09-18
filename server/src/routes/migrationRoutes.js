import { Router } from 'express';
import { migrateLocalData } from '../controllers/migrationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/local-data', migrateLocalData);

export default router;
