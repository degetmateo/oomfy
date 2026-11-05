import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';

const router = Router();

router.post('/', AuthGuard.requireAuth, ReportController.create);
router.get('/', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ReportController.list);
router.put('/:id', AuthGuard.requireAuth, AuthGuard.requireRole(['admin', 'mod']), ReportController.resolve);

export default router;

