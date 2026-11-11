import { Router } from 'express';
import multer from 'multer';
import { ChatController } from '../controllers/ChatController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';
import { CreateChatSchema, SendMessageSchema } from '@oomfy/shared';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();

router.get('/', AuthGuard.requireAuth, ChatController.listChats);
router.get('/unread-count', AuthGuard.requireAuth, ChatController.getUnreadCount);
router.get('/:id/messages', AuthGuard.requireAuth, ChatController.listMessages);
router.post('/start', AuthGuard.requireAuth, ValidateRequest.body(CreateChatSchema), ChatController.getOrCreatePrivateChat);
router.post('/messages', AuthGuard.requireAuth, upload.array('images', 4), validateUploadedImages, ValidateRequest.body(SendMessageSchema), ChatController.sendMessage);
router.post('/:id/read', AuthGuard.requireAuth, ChatController.markAsRead);
router.delete('/messages/:id', AuthGuard.requireAuth, ChatController.deleteMessage);

export default router;

