import { Router } from 'express';
import {
  UpdateUsernameSchema,
  UpdatePasswordSchema,
  RequestEmailChangeSchema,
  ConfirmEmailChangeSchema,
} from '@oomfy/shared';
import { SettingsController } from '../controllers/SettingsController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const strictSettingsLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'settings-strict' });

router.post('/email/confirm', strictSettingsLimiter, ValidateRequest.body(ConfirmEmailChangeSchema), SettingsController.confirmEmailChange);

router.use(AuthGuard.requireAuth, strictSettingsLimiter);

router.put('/username', ValidateRequest.body(UpdateUsernameSchema), SettingsController.updateUsername);
router.put('/password', ValidateRequest.body(UpdatePasswordSchema), SettingsController.updatePassword);
router.post('/email/request', ValidateRequest.body(RequestEmailChangeSchema), SettingsController.requestEmailChange);

export default router;
