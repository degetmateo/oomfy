import { Router } from 'express';
import { UsernameParamSchema, PaginationQuerySchema } from '@oomfy/shared';
import { FollowController } from '../controllers/FollowController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const followWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 40, prefix: 'follows-write' });

router.post('/:username', AuthGuard.requireAuth, followWriteLimiter, ValidateRequest.params(UsernameParamSchema), FollowController.follow);
router.delete('/:username', AuthGuard.requireAuth, followWriteLimiter, ValidateRequest.params(UsernameParamSchema), FollowController.unfollow);
router.get('/:username/followers', AuthGuard.optionalAuth, ValidateRequest.params(UsernameParamSchema), ValidateRequest.query(PaginationQuerySchema), FollowController.getFollowers);
router.get('/:username/followed', AuthGuard.optionalAuth, ValidateRequest.params(UsernameParamSchema), ValidateRequest.query(PaginationQuerySchema), FollowController.getFollowed);
router.get('/:username/following', AuthGuard.optionalAuth, ValidateRequest.params(UsernameParamSchema), ValidateRequest.query(PaginationQuerySchema), FollowController.getFollowed);

export default router;
