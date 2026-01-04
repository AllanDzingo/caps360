import { Request, Response } from 'express';
import progressService from '../services/progress.service';
import logger from '../config/logger';

export class ProgressController {

    /**
     * Start a lesson
     * POST /api/progress/lessons/:id/start
     */
    async startLesson(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.body.userId || 'demo-user-id'; // TODO: Get from auth
            const { id } = req.params;

            await progressService.startLesson(userId, id);

            res.json({ success: true, message: 'Lesson started' });
        } catch (error) {
            logger.error(`Start lesson error`, error);
            res.status(500).json({ success: false, message: 'Failed to start lesson' });
        }
    }

    /**
     * Complete a lesson
     * POST /api/progress/lessons/:id/complete
     * Body: { quizScore?: number }
     */
    async completeLesson(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.body.userId || 'demo-user-id'; // TODO: Get from auth
            const { id } = req.params;
            const { quizScore } = req.body;

            await progressService.completeLesson(userId, id, quizScore);

            res.json({ success: true, message: 'Lesson completed' });
        } catch (error) {
            logger.error(`Complete lesson error`, error);
            res.status(500).json({ success: false, message: 'Failed to complete lesson' });
        }
    }

    /**
     * Get Dashboard Progress
     * GET /api/progress/dashboard
     */
    async getDashboardProgress(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.query.userId as string || 'demo-user-id'; // TODO: Get from auth
            const progress = await progressService.getDashboardProgress(userId);

            res.json({ success: true, data: progress });
        } catch (error) {
            logger.error(`Dashboard progress error`, error);
            res.status(500).json({ success: false, message: 'Failed to get dashboard progress' });
        }
    }
}

export default new ProgressController();
