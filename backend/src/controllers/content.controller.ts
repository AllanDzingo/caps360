import { Request, Response } from 'express';
import contentService from '../services/content.service';
import logger from '../config/logger';

export class ContentController {

    /**
     * Get Dashboard Subjects (Courses)
     * Query Params: grade (optional - defaults to user's grade if auth'd, or 10)
     */
    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Extract grade from authenticated user if available
            // const user = req.user; 
            const grade = req.query.grade ? parseInt(req.query.grade as string) : 10;

            const subjects = await contentService.getSubjectsByGrade(grade);

            res.json({
                success: true,
                data: subjects
            });
        } catch (error) {
            logger.error('Dashboard error', error);
            res.status(500).json({ success: false, message: 'Failed to load dashboard' });
        }
    }

    /**
     * Get All Available Subjects for a grade
     * Query Params: grade
     */
    async getSubjects(req: Request, res: Response): Promise<void> {
        try {
            const grade = req.query.grade ? parseInt(req.query.grade as string) : 10;
            const subjects = await contentService.getSubjectsByGrade(grade);

            res.json({
                success: true,
                subjects: subjects.map(s => s.title)
            });
        } catch (error) {
            logger.error('Get subjects error', error);
            res.status(500).json({ success: false, message: 'Failed to load subjects' });
        }
    }

    /**
     * Get Subject Details (Metadata Only)
     */
    async getSubject(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            // Validate UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                res.status(400).json({ success: false, message: 'Invalid subject ID format' });
                return;
            }

            const subject = await contentService.getSubjectById(id);

            if (!subject) {
                res.status(404).json({ success: false, message: 'Subject not found' });
                return;
            }

            res.json({
                success: true,
                data: subject
            });
        } catch (error) {
            logger.error(`Subject metadata error ${req.params.id}`, error);
            res.status(500).json({ success: false, message: 'Failed to load subject' });
        }
    }

    /**
     * Get Topics for a Subject
     */
    async getSubjectTopics(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            // Validate UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                res.status(400).json({ success: false, message: 'Invalid subject ID format' });
                return;
            }

            // Check if subject exists first
            const subject = await contentService.getSubjectById(id);
            if (!subject) {
                res.status(404).json({ success: false, message: 'Subject not found' });
                return;
            }

            const topics = await contentService.getTopicsWithLessonsBySubject(id);

            if (topics.length === 0) {
                logger.warn(`Subject ${id} has no associated topics in DB`);
            }

            res.json({
                success: true,
                data: topics
            });
        } catch (error) {
            logger.error(`Subject topics error ${req.params.id}`, error);
            res.status(500).json({ success: false, message: 'Failed to load topics' });
        }
    }

    /**
     * Get Topic Details (with Lessons)
     */
    async getTopic(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const lessons = await contentService.getLessonsByTopic(id);

            res.json({
                success: true,
                data: {
                    id, // simplistic, ideally fetch topic metadata too
                    lessons
                }
            });
        } catch (error) {
            logger.error(`Topic error ${req.params.id}`, error);
            res.status(500).json({ success: false, message: 'Failed to load topic' });
        }
    }
}

export default new ContentController();
