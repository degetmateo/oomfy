import { Router } from 'express';
import multer from 'multer';
import { UpdateProfileSchema } from '@oomfy/shared';
import { ProfileController } from '../controllers/ProfileController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();

router.get('/me', AuthGuard.requireAuth, ProfileController.getMe);
router.post('/me/accept-terms', AuthGuard.requireAuth, ProfileController.acceptTerms);
router.get('/:username/icon', ProfileController.getUserIcon);
router.get('/:username/banner', ProfileController.getUserBanner);
router.get('/:username', AuthGuard.optionalAuth, ProfileController.getProfile);
router.put(
  '/me',
  AuthGuard.requireAuth,
  upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  validateUploadedImages,
  ValidateRequest.body(UpdateProfileSchema),
  ProfileController.updateProfile
);

export default router;
