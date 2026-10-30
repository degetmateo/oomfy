import { Router } from 'express';
import { InteractionController } from '../controllers/InteractionController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.post('/:publicationId/upvote', AuthGuard.requireAuth, InteractionController.upvote);
router.delete('/:publicationId/upvote', AuthGuard.requireAuth, InteractionController.downvote);
router.post('/:publicationId/share', AuthGuard.requireAuth, InteractionController.share);
router.delete('/:publicationId/share', AuthGuard.requireAuth, InteractionController.unshare);

export default router;
