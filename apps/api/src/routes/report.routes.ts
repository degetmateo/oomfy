import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const reportLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'report-create' });

router.post('/', AuthGuard.requireAuth, reportLimiter, ReportController.create);
router.get('/', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ReportController.list);
router.put('/:id', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ReportController.resolve);

export default router;

