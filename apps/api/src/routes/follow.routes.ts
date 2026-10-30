import { Router } from 'express';
import { FollowController } from '../controllers/FollowController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.post('/:username', AuthGuard.requireAuth, FollowController.follow);
router.delete('/:username', AuthGuard.requireAuth, FollowController.unfollow);
router.get('/:username/followers', AuthGuard.optionalAuth, FollowController.getFollowers);
router.get('/:username/followed', AuthGuard.optionalAuth, FollowController.getFollowed);

export default router;

