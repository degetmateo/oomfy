import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { CreateChatSchema, SendMessageSchema } from '@oomfy/shared';

const router = Router();

router.get('/', AuthGuard.requireAuth, ChatController.listChats);
router.get('/unread-count', AuthGuard.requireAuth, ChatController.getUnreadCount);
router.get('/:id/messages', AuthGuard.requireAuth, ChatController.listMessages);
router.post('/start', AuthGuard.requireAuth, ValidateRequest.body(CreateChatSchema), ChatController.getOrCreatePrivateChat);
router.post('/messages', AuthGuard.requireAuth, ValidateRequest.body(SendMessageSchema), ChatController.sendMessage);
router.post('/:id/read', AuthGuard.requireAuth, ChatController.markAsRead);

export default router;

