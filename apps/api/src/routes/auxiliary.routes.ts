import { Router } from 'express';
import { AuxController } from '../controllers/AuxController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/gifs', AuthGuard.requireAuth, AuxController.searchGifs);
router.get('/preview-url', AuthGuard.optionalAuth, AuxController.getLinkPreview);
router.get('/online-members', AuthGuard.optionalAuth, AuxController.getOnlineMembers);
router.get('/suggested-members', AuthGuard.optionalAuth, AuxController.getSuggestedMembers);
router.get('/search-users', AuthGuard.optionalAuth, AuxController.searchUsers);

export default router;
