import { Router } from 'express';
import multer from 'multer';
import {
  UpdateUsernameSchema,
  UpdatePasswordSchema,
  RequestEmailChangeSchema,
  ConfirmEmailChangeSchema,
  CreateEmoteSchema,
  LIMITS,
} from '@oomfy/shared';
import { SettingsController } from '../controllers/SettingsController.js';
import { EmoteController } from '../controllers/EmoteController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';

const router = Router();
const strictSettingsLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'settings-strict' });
const emoteUpload = multer({ limits: { fileSize: LIMITS.EMOTE_MAX_FILE_BYTES }, fileFilter: imageFileFilter });

router.post('/email/confirm', strictSettingsLimiter, ValidateRequest.body(ConfirmEmailChangeSchema), SettingsController.confirmEmailChange);
router.get('/emotes', AuthGuard.requireAuth, EmoteController.listEmotes);

router.use(AuthGuard.requireAuth, strictSettingsLimiter);

router.put('/username', ValidateRequest.body(UpdateUsernameSchema), SettingsController.updateUsername);
router.put('/password', ValidateRequest.body(UpdatePasswordSchema), SettingsController.updatePassword);
router.post('/email/request', ValidateRequest.body(RequestEmailChangeSchema), SettingsController.requestEmailChange);
router.post('/emotes', emoteUpload.single('image'), validateUploadedImages, ValidateRequest.body(CreateEmoteSchema), EmoteController.createEmote);
router.post('/emotes/import', EmoteController.importEmote);
router.post('/emotes/:id/import', EmoteController.importEmote);
router.delete('/emotes/:id', EmoteController.deleteEmote);

export default router;
