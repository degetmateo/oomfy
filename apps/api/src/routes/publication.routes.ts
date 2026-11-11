import { Router } from 'express';
import multer from 'multer';
import { CreatePublicationFormSchema, QueryPublicationSchema, EntityIdParamSchema } from '@oomfy/shared';
import { PublicationController } from '../controllers/PublicationController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { imageFileFilter, validateUploadedImages } from '../middlewares/FileUploadGuard.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
const router = Router();
const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 25, prefix: 'pub-write' });

router.get('/', AuthGuard.optionalAuth, ValidateRequest.query(QueryPublicationSchema), PublicationController.getFeed);
router.get('/:id/ancestors', AuthGuard.optionalAuth, ValidateRequest.params(EntityIdParamSchema), PublicationController.getAncestors);
router.get('/:id', AuthGuard.optionalAuth, ValidateRequest.params(EntityIdParamSchema), PublicationController.getById);
router.post('/', AuthGuard.requireAuth, writeLimiter, upload.array('images', 4), validateUploadedImages, ValidateRequest.body(CreatePublicationFormSchema), PublicationController.create);
router.delete('/:id', AuthGuard.requireAuth, writeLimiter, ValidateRequest.params(EntityIdParamSchema), PublicationController.delete);

export default router;
