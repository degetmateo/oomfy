import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/', AuthGuard.requireAuth, NotificationController.getNotifications);
router.post('/read', AuthGuard.requireAuth, NotificationController.markAllAsRead);
router.get('/vapid-public-key', NotificationController.getVapidPublicKey);
router.post('/subscribe', AuthGuard.requireAuth, NotificationController.subscribePush);
router.post('/unsubscribe', NotificationController.unsubscribePush);

export default router;

