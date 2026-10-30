import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.put('/username', AuthGuard.requireAuth, SettingsController.updateUsername);
router.put('/password', AuthGuard.requireAuth, SettingsController.updatePassword);

export default router;

