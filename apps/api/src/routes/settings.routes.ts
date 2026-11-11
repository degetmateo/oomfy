import { Router } from 'express';
import { UpdateUsernameSchema, UpdatePasswordSchema } from '@oomfy/shared';
import { SettingsController } from '../controllers/SettingsController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';

const router = Router();

router.put('/username', AuthGuard.requireAuth, ValidateRequest.body(UpdateUsernameSchema), SettingsController.updateUsername);
router.put('/password', AuthGuard.requireAuth, ValidateRequest.body(UpdatePasswordSchema), SettingsController.updatePassword);

export default router;

