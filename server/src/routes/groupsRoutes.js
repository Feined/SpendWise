import { Router } from 'express';
import {
  getGroups,
  createGroup,
  getGroupDetails,
  joinGroup,
  addGroupMember,
  removeGroupMember,
} from '../controllers/groupsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getGroups);
router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:id', getGroupDetails);
router.post('/:id/members', addGroupMember);
router.delete('/:id/members/:memberId', removeGroupMember);

export default router;
