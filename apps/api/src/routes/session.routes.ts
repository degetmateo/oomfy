import { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/', AuthGuard.requireAuth, SessionController.listSessions);
router.delete('/others', AuthGuard.requireAuth, SessionController.revokeOtherSessions);
router.delete('/:id', AuthGuard.requireAuth, SessionController.revokeSession);

export default router;
