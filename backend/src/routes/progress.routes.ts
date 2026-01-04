import { Router } from 'express';
import progressController from '../controllers/progress.controller';

const router = Router();

// TODO: Add Auth middleware
router.post('/lessons/:id/start', (req, res) => progressController.startLesson(req, res));
router.post('/lessons/:id/complete', (req, res) => progressController.completeLesson(req, res));
router.get('/dashboard', (req, res) => progressController.getDashboardProgress(req, res));

export default router;
