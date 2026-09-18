import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
