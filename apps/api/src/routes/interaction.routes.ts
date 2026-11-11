import { Router } from 'express';
import { PublicationIdParamSchema } from '@oomfy/shared';
import { InteractionController } from '../controllers/InteractionController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const interactionLimiter = createRateLimiter({ windowMs: 60_000, max: 90, prefix: 'interactions' });

router.use(AuthGuard.requireAuth, interactionLimiter);

router.post('/:publicationId/upvote', ValidateRequest.params(PublicationIdParamSchema), InteractionController.upvote);
router.delete('/:publicationId/upvote', ValidateRequest.params(PublicationIdParamSchema), InteractionController.downvote);
router.post('/:publicationId/share', ValidateRequest.params(PublicationIdParamSchema), InteractionController.share);
router.delete('/:publicationId/share', ValidateRequest.params(PublicationIdParamSchema), InteractionController.unshare);

export default router;
