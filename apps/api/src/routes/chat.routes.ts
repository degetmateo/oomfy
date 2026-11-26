import { Router } from 'express';
import multer from 'multer';
import { ChatController } from '../controllers/ChatController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';
import {
  CreateChatSchema, SendMessageSchema, SendMessageAdminSchema, SharePublicationMessageSchema, EntityIdParamSchema, PaginationQuerySchema,
} from '@oomfy/shared';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();
const msgLimiter = createRateLimiter({ windowMs: 60_000, max: 60, prefix: 'chat-msg' });

router.use(AuthGuard.requireAuth);

router.get('/', ChatController.listChats);
router.get('/unread-count', ChatController.getUnreadCount);
router.get('/:id/messages', ValidateRequest.params(EntityIdParamSchema), ValidateRequest.query(PaginationQuerySchema), ChatController.listMessages);
router.post('/start', msgLimiter, ValidateRequest.body(CreateChatSchema), ChatController.getOrCreatePrivateChat);
router.post('/share-publication', msgLimiter, ValidateRequest.body(SharePublicationMessageSchema), ChatController.sharePublication);
router.post('/messages', msgLimiter, upload.array('images', 4), validateUploadedImages, ValidateRequest.bodyForUserOrAdmin(SendMessageSchema, SendMessageAdminSchema), ChatController.sendMessage);
router.post('/:id/read', ValidateRequest.params(EntityIdParamSchema), ChatController.markAsRead);
router.delete('/messages/:id', ValidateRequest.params(EntityIdParamSchema), ChatController.deleteMessage);

export default router;
