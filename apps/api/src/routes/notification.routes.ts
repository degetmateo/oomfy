import { Router } from 'express';
import {
  PushSubscribeSchema,
  PushUnsubscribeSchema,
  PushPreferencesUpdateSchema,
  PaginationQuerySchema,
} from '@oomfy/shared';
import { NotificationController } from '../controllers/NotificationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const pushLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: 'push-ops' });

router.get('/', AuthGuard.requireAuth, ValidateRequest.query(PaginationQuerySchema), NotificationController.getNotifications);
router.get('/unread-count', AuthGuard.requireAuth, NotificationController.getUnreadCount);
router.post('/read', AuthGuard.requireAuth, pushLimiter, NotificationController.markAllAsRead);
router.get('/vapid-public-key', NotificationController.getVapidPublicKey);
router.get('/preferences', AuthGuard.requireAuth, NotificationController.getPreferences);
router.patch('/preferences', AuthGuard.requireAuth, pushLimiter, ValidateRequest.body(PushPreferencesUpdateSchema), NotificationController.updatePreferences);
router.post('/subscribe', AuthGuard.requireAuth, pushLimiter, ValidateRequest.body(PushSubscribeSchema), NotificationController.subscribePush);
router.post('/unsubscribe', AuthGuard.optionalAuth, pushLimiter, ValidateRequest.body(PushUnsubscribeSchema), NotificationController.unsubscribePush);

export default router;
