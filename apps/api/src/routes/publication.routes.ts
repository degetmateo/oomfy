import { Router } from 'express';
import multer from 'multer';
import { PublicationController } from '../controllers/PublicationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', AuthGuard.requireAuth, PublicationController.getFeed);
router.get('/:id/ancestors', AuthGuard.requireAuth, PublicationController.getAncestors);
router.get('/:id', AuthGuard.requireAuth, PublicationController.getById);
router.post('/', AuthGuard.requireAuth, upload.array('images', 4), PublicationController.create);
router.delete('/:id', AuthGuard.requireAuth, PublicationController.delete);

export default router;
