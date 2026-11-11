import { Router } from 'express';
import {
  SystemSettingsUpdateSchema,
  AdminUserUpdateSchema,
  AdminUserStatusSchema,
  AdminUserRoleSchema,
  AdminUserQuerySchema,
  AdminPushBroadcastSchema,
  EntityIdParamSchema,
} from '@oomfy/shared';
import { AdminController } from '../controllers/AdminController.js';
import { AdminUserController } from '../controllers/AdminUserController.js';
import { AdminPushController } from '../controllers/AdminPushController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

export const adminRouter = Router();
const adminLimiter = createRateLimiter({ windowMs: 60_000, max: 60, prefix: 'admin-ops' });

adminRouter.use(AuthGuard.requireAuth, AuthGuard.requireRole(['admin']), adminLimiter);

adminRouter.get('/settings', AdminController.getSettings);
adminRouter.put('/settings', ValidateRequest.body(SystemSettingsUpdateSchema), AdminController.updateSettings);

adminRouter.get('/users', ValidateRequest.query(AdminUserQuerySchema), AdminUserController.listUsers);
adminRouter.put('/users/:id', ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(AdminUserUpdateSchema), AdminUserController.updateUser);
adminRouter.put('/users/:id/status', ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(AdminUserStatusSchema), AdminUserController.setUserStatus);
adminRouter.put('/users/:id/role', ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(AdminUserRoleSchema), AdminUserController.setUserRole);
adminRouter.post('/users/:id/revoke-sessions', ValidateRequest.params(EntityIdParamSchema), AdminUserController.revokeUserSessions);

adminRouter.delete('/publications/:id', ValidateRequest.params(EntityIdParamSchema), AdminController.deletePublication);
adminRouter.get('/stats', AdminController.getStats);
adminRouter.post('/sessions/revoke-all', AdminController.revokeAllSessions);

adminRouter.post('/notifications/push/broadcast', ValidateRequest.body(AdminPushBroadcastSchema), AdminPushController.sendPush);
