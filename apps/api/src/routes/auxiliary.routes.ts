import { Router } from 'express';
import { SearchQuerySchema, LinkPreviewQuerySchema, PaginationQuerySchema } from '@oomfy/shared';
import { AuxController } from '../controllers/AuxController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const previewLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: 'preview-url' });
const searchLimiter = createRateLimiter({ windowMs: 60_000, max: 60, prefix: 'aux-search' });

router.get('/gifs', AuthGuard.requireAuth, searchLimiter, ValidateRequest.query(SearchQuerySchema), AuxController.searchGifs);
router.get('/preview-url', AuthGuard.optionalAuth, previewLimiter, ValidateRequest.query(LinkPreviewQuerySchema), AuxController.getLinkPreview);
router.get('/online-members', AuthGuard.optionalAuth, AuxController.getOnlineMembers);
router.get('/suggested-members', AuthGuard.optionalAuth, ValidateRequest.query(PaginationQuerySchema), AuxController.getSuggestedMembers);
router.get('/search-users', AuthGuard.optionalAuth, searchLimiter, ValidateRequest.query(SearchQuerySchema), AuxController.searchUsers);

export default router;
