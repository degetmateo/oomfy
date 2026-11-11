import { Router } from 'express';
import { EntityIdParamSchema } from '@oomfy/shared';
import { SessionController } from '../controllers/SessionController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const sessionLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: 'sessions' });

router.use(AuthGuard.requireAuth, sessionLimiter);

router.get('/', SessionController.listSessions);
router.delete('/others', SessionController.revokeOtherSessions);
router.delete('/:id', ValidateRequest.params(EntityIdParamSchema), SessionController.revokeSession);

export default router;
