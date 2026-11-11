import { Router } from 'express';
import multer from 'multer';
import { CreatePublicationFormSchema, QueryPublicationSchema } from '@oomfy/shared';
import { PublicationController } from '../controllers/PublicationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();

router.get('/', AuthGuard.optionalAuth, ValidateRequest.query(QueryPublicationSchema), PublicationController.getFeed);
router.get('/:id/ancestors', AuthGuard.optionalAuth, PublicationController.getAncestors);
router.get('/:id', AuthGuard.optionalAuth, PublicationController.getById);
router.post('/', AuthGuard.requireAuth, upload.array('images', 4), validateUploadedImages, ValidateRequest.body(CreatePublicationFormSchema), PublicationController.create);
router.delete('/:id', AuthGuard.requireAuth, PublicationController.delete);

export default router;
