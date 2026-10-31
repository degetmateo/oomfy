import { Router } from 'express';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import publicationRoutes from './publication.routes.js';
import interactionRoutes from './interaction.routes.js';
import followRoutes from './follow.routes.js';
import notificationRoutes from './notification.routes.js';
import chatRoutes from './chat.routes.js';
import sessionRoutes from './session.routes.js';
import auxRoutes from './auxiliary.routes.js';
import settingsRoutes from './settings.routes.js';
import { adminRouter } from './admin.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/members', profileRoutes);
apiRouter.use('/publications', publicationRoutes);
apiRouter.use('/interactions', interactionRoutes);
apiRouter.use('/follows', followRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/chats', chatRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/aux', auxRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/admin', adminRouter);

export default apiRouter;
