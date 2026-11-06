import { Router } from 'express';
import { AuxController } from '../controllers/AuxController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/gifs', AuthGuard.requireAuth, AuxController.searchGifs);
router.get('/preview-url', AuthGuard.requireAuth, AuxController.getLinkPreview);
router.get('/online-members', AuthGuard.requireAuth, AuxController.getOnlineMembers);
router.get('/suggested-members', AuthGuard.requireAuth, AuxController.getSuggestedMembers);
router.get('/search-users', AuthGuard.requireAuth, AuxController.searchUsers);

export default router;
