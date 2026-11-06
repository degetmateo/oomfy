import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.get('/', AuthGuard.requireAuth, NotificationController.getNotifications);
router.post('/read', AuthGuard.requireAuth, NotificationController.markAllAsRead);
router.get('/vapid-public-key', NotificationController.getVapidPublicKey);
router.get('/preferences', AuthGuard.requireAuth, NotificationController.getPreferences);
router.patch('/preferences', AuthGuard.requireAuth, NotificationController.updatePreferences);
router.post('/subscribe', AuthGuard.requireAuth, NotificationController.subscribePush);
router.post('/unsubscribe', NotificationController.unsubscribePush);

export default router;

