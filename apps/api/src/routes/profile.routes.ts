import { Router } from 'express';
import multer from 'multer';
import { UpdateProfileSchema, DeleteAccountSchema, UsernameParamSchema } from '@oomfy/shared';
import { ProfileController } from '../controllers/ProfileController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();
const lifecycleLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'account-lifecycle' });

router.get('/me', AuthGuard.requireAuth, ProfileController.getMe);
router.get('/me/export', AuthGuard.requireAuth, lifecycleLimiter, ProfileController.exportMyData);
router.delete('/me', AuthGuard.requireAuth, lifecycleLimiter, ValidateRequest.body(DeleteAccountSchema), ProfileController.deleteMe);
router.post('/me/accept-terms', AuthGuard.requireAuth, ProfileController.acceptTerms);
router.get('/:username/icon', ValidateRequest.params(UsernameParamSchema), ProfileController.getUserIcon);
router.get('/:username/banner', ValidateRequest.params(UsernameParamSchema), ProfileController.getUserBanner);
router.get('/:username', AuthGuard.optionalAuth, ValidateRequest.params(UsernameParamSchema), ProfileController.getProfile);
router.put(
  '/me',
  AuthGuard.requireAuth,
  upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  validateUploadedImages,
  ValidateRequest.body(UpdateProfileSchema),
  ProfileController.updateProfile
);

export default router;
