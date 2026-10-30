import { Router } from 'express';
import multer from 'multer';
import { PublicationController } from '../controllers/PublicationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', AuthGuard.optionalAuth, PublicationController.getFeed);
router.get('/:id', AuthGuard.optionalAuth, PublicationController.getById);
router.post('/', AuthGuard.requireAuth, upload.array('images', 4), PublicationController.create);
router.delete('/:id', AuthGuard.requireAuth, PublicationController.delete);

export default router;

