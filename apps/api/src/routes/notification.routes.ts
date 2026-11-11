import { Router } from 'express';
import { PushSubscribeSchema, PushUnsubscribeSchema, PushPreferencesUpdateSchema } from '@oomfy/shared';
import { NotificationController } from '../controllers/NotificationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';

const router = Router();

router.get('/', AuthGuard.requireAuth, NotificationController.getNotifications);
router.get('/unread-count', AuthGuard.requireAuth, NotificationController.getUnreadCount);
router.post('/read', AuthGuard.requireAuth, NotificationController.markAllAsRead);
router.get('/vapid-public-key', NotificationController.getVapidPublicKey);
router.get('/preferences', AuthGuard.requireAuth, NotificationController.getPreferences);
router.patch('/preferences', AuthGuard.requireAuth, ValidateRequest.body(PushPreferencesUpdateSchema), NotificationController.updatePreferences);
router.post('/subscribe', AuthGuard.requireAuth, ValidateRequest.body(PushSubscribeSchema), NotificationController.subscribePush);
router.post('/unsubscribe', AuthGuard.optionalAuth, ValidateRequest.body(PushUnsubscribeSchema), NotificationController.unsubscribePush);

export default router;

