import { Router } from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers/ProfileController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.get('/me', AuthGuard.requireAuth, ProfileController.getMe);
router.get('/:username', AuthGuard.optionalAuth, ProfileController.getProfile);
router.put(
  '/me',
  AuthGuard.requireAuth,
  upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  ProfileController.updateProfile
);

export default router;

