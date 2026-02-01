import { Router } from 'express';
// import { authenticate } from '../middleware/auth.middleware'; // Uncomment when auth is ready
import contentController from '../controllers/content.controller';

const router = Router();

// Public/Protected routes
// router.use(authenticate); 

router.get('/dashboard', (req, res) => contentController.getDashboard(req, res));
router.get('/subjects', (req, res) => contentController.getSubjects(req, res));
router.get('/subjects/:id', (req, res) => contentController.getSubject(req, res));
router.get('/subjects/:id/topics', (req, res) => contentController.getSubjectTopics(req, res));
router.get('/topics/:id', (req, res) => contentController.getTopic(req, res));

export default router;
