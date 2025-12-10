import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import contentService from '../services/content.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/content/courses
 * Get all courses
 */
router.get(
    '/courses',
    authenticate,
    [
        query('grade').optional().isInt({ min: 1, max: 12 }),
        query('subject').optional().trim(),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
            const subject = req.query.subject as string | undefined;

            const courses = await contentService.getCourses(grade, subject);

            res.json(courses);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /api/content/courses/:courseId
 * Get course by ID
 */
router.get('/courses/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const course = await contentService.getCourseById(req.params.courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(course);
        return;
    } catch (error: any) {
        res.status(500).json({ error: error.message });
        return;
    }
});

/**
 * GET /api/content/courses/:courseId/lessons
 * Get lessons for a course
 */
router.get('/courses/:courseId/lessons', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const lessons = await contentService.getLessonsByCourse(req.params.courseId);

        res.json(lessons);
        return;
    } catch (error: any) {
        res.status(500).json({ error: error.message });
        return;
    }
});

/**
 * GET /api/content/lessons/:lessonId
 * Get lesson by ID with signed URLs
 */
router.get('/lessons/:lessonId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const lesson = await contentService.getLessonById(req.params.lessonId);

        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        // Check access
        const hasAccess = contentService.hasAccessToContent(
            req.user.currentTier,
            lesson.accessTier
        );

        if (!hasAccess) {
            return res.status(403).json({
                error: 'Insufficient subscription tier',
                required: lesson.accessTier,
            });
        }

        // Track lesson view
        await analyticsService.trackEvent(
            req.userId,
            AnalyticsEventType.LESSON_START,
            { lessonId: lesson.id },
            req.user.currentTier,
            req.user.role
        );

        res.json(lesson);
        return;
    } catch (error: any) {
        res.status(500).json({ error: error.message });
        return;
    }
});

export default router;
