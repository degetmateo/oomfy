import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

export const adminRouter = Router();

adminRouter.use(AuthGuard.requireAuth);
adminRouter.use(AuthGuard.requireRole(['admin']));

adminRouter.get('/settings', AdminController.getSettings);
adminRouter.put('/settings', AdminController.updateSettings);

adminRouter.get('/users', AdminController.listUsers);
adminRouter.put('/users/:id/status', AdminController.setUserStatus);
adminRouter.put('/users/:id/role', AdminController.setUserRole);

adminRouter.delete('/publications/:id', AdminController.deletePublication);
adminRouter.get('/stats', AdminController.getStats);

adminRouter.post('/sessions/revoke-all', AdminController.revokeAllSessions);
adminRouter.post('/users/:id/revoke-sessions', AdminController.revokeUserSessions);

