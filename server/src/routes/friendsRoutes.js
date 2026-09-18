import { Router } from 'express';
import {
  getFriends,
  createFriend,
  deleteFriend,
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from '../controllers/friendsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Social Friend Discovery & Requests
router.get('/search', searchUsers);
router.get('/requests', getFriendRequests);
router.post('/request', sendFriendRequest);
router.post('/requests/:id/accept', acceptFriendRequest);
router.post('/requests/:id/decline', declineFriendRequest);

// Friends Directory
router.get('/', getFriends);
router.post('/', createFriend);
router.delete('/:id', deleteFriend);

export default router;
