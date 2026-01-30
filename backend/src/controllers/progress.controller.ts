import { Request, Response } from 'express';
import progressService from '../services/progress.service';
import logger from '../config/logger';

export class ProgressController {

    /**
     * Start a lesson
     * POST /api/progress/lessons/:id/start
     */
    async startLesson(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.body.userId;
            const { id } = req.params;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'Missing userId' });
            }
            // Optionally: check user exists, else 404
            const user = await (await import('../services/auth.service')).default.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            await progressService.startLesson(userId, id);
            return res.json({ success: true, message: 'Lesson started' });
        } catch (error) {
            logger.error(`Start lesson error`, error);
            return res.status(500).json({ success: false, message: 'Failed to start lesson' });
        }
    }

    /**
     * Complete a lesson
     * POST /api/progress/lessons/:id/complete
     * Body: { quizScore?: number }
     */
    async completeLesson(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.body.userId;
            const { id } = req.params;
            const { quizScore } = req.body;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'Missing userId' });
            }
            const user = await (await import('../services/auth.service')).default.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            await progressService.completeLesson(userId, id, quizScore);
            return res.json({ success: true, message: 'Lesson completed' });
        } catch (error) {
            logger.error(`Complete lesson error`, error);
            return res.status(500).json({ success: false, message: 'Failed to complete lesson' });
        }
    }

    /**
     * Get Dashboard Progress
     * GET /api/progress/dashboard
     */
    async getDashboardProgress(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.query.userId as string;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'Missing userId' });
            }
            const user = await (await import('../services/auth.service')).default.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const progress = await progressService.getDashboardProgress(userId);
            // If no progress, return empty object (not error)
            if (!progress || Object.keys(progress).length === 0) {
                return res.status(200).json({ success: true, data: {} });
            }
            return res.json({ success: true, data: progress });
        } catch (error) {
            logger.error(`Dashboard progress error`, error);
            return res.status(500).json({ success: false, message: 'Failed to get dashboard progress' });
        }
    }
}

export default new ProgressController();
