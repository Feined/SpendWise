import { Router } from 'express';
import {
  getSplits,
  createSplit,
  getSplitById,
  settleSplit,
  deleteSplit,
} from '../controllers/splitsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getSplits);
router.post('/', createSplit);
router.get('/:id', getSplitById);
router.post('/:id/settle', settleSplit);
router.delete('/:id', deleteSplit);

export default router;
