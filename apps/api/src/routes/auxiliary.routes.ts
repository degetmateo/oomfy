import { Router } from 'express';
import { AuxController } from '../controllers/AuxController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const previewLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, prefix: 'preview-url' });

router.get('/gifs', AuthGuard.requireAuth, AuxController.searchGifs);
router.get('/preview-url', AuthGuard.optionalAuth, previewLimiter, AuxController.getLinkPreview);
router.get('/online-members', AuthGuard.optionalAuth, AuxController.getOnlineMembers);
router.get('/suggested-members', AuthGuard.optionalAuth, AuxController.getSuggestedMembers);
router.get('/search-users', AuthGuard.optionalAuth, AuxController.searchUsers);

export default router;
