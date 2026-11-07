import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { AdminUserController } from '../controllers/AdminUserController.js';
import { AdminPushController } from '../controllers/AdminPushController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

export const adminRouter = Router();

adminRouter.use(AuthGuard.requireAuth);
adminRouter.use(AuthGuard.requireRole(['admin']));

adminRouter.get('/settings', AdminController.getSettings);
adminRouter.put('/settings', AdminController.updateSettings);

adminRouter.get('/users', AdminUserController.listUsers);
adminRouter.put('/users/:id', AdminUserController.updateUser);
adminRouter.put('/users/:id/status', AdminUserController.setUserStatus);
adminRouter.put('/users/:id/role', AdminUserController.setUserRole);
adminRouter.post('/users/:id/revoke-sessions', AdminUserController.revokeUserSessions);

adminRouter.delete('/publications/:id', AdminController.deletePublication);
adminRouter.get('/stats', AdminController.getStats);
adminRouter.post('/sessions/revoke-all', AdminController.revokeAllSessions);

adminRouter.post('/notifications/push/broadcast', AdminPushController.sendPush);
