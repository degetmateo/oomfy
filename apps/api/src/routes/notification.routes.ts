import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/', AuthGuard.requireAuth, NotificationController.getNotifications);
router.post('/read', AuthGuard.requireAuth, NotificationController.markAllAsRead);

export default router;

