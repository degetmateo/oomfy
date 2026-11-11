import { Router } from 'express';
import { CreateReportSchema, ResolveReportSchema, ReportQuerySchema, EntityIdParamSchema } from '@oomfy/shared';
import { ReportController } from '../controllers/ReportController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const reportLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'report-create' });

router.post('/', AuthGuard.requireAuth, reportLimiter, ValidateRequest.body(CreateReportSchema), ReportController.create);
router.get('/', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ValidateRequest.query(ReportQuerySchema), ReportController.list);
router.put('/:id', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(ResolveReportSchema), ReportController.resolve);

export default router;
