import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import aiService from '../services/ai.service';
import upload from '../middleware/upload.middleware';
import { uploadBufferToBlob, isBlobUploadEnabled } from '../services/blob-storage.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireFeature } from '../middleware/tier-access.middleware';
import { aiLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
// ...existing code...

/**
 * POST /api/ai/chat
 * AI Tutor Chat
 */
router.post(
    '/chat',
    authenticate,
    requireFeature('ai_tutor'),
    aiLimiter,
    [body('message').trim().notEmpty()],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { message, conversationId, lessonContext } = req.body;

            const result = await aiService.chat(req.userId, message, conversationId, lessonContext);

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.AI_CHAT_MESSAGE,
                { conversationId: result.conversationId },
                req.user.currentTier,
                req.user.role
            );

            res.json(result);
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

/**
 * POST /api/ai/upload
 * Upload file or image for AI analysis
 */
router.post(
    '/upload',
    authenticate,
    upload.single('file'),
    aiLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            if (!isBlobUploadEnabled()) {
                return res.status(503).json({ error: 'File upload service unavailable' });
            }
            const { conversationId } = req.body;
            const fileName = req.file.originalname;
            const fileType = req.file.mimetype;
            // Upload to Azure Blob Storage
            const uploadResult = await uploadBufferToBlob(req.file.buffer, fileName, fileType);
            if (!uploadResult) {
                return res.status(500).json({ error: 'Failed to upload file to storage' });
            }
            let reply = `I received your file "${fileName}" and uploaded it to secure storage.`;
            if (fileType.startsWith('image/')) {
                reply += " I can see it's an image. In a full implementation, I would use OCR to extract text and help you with the content. For now, please describe what you need help with from this image.";
            } else if (fileType === 'application/pdf') {
                reply += " It's a PDF document. I would normally extract and analyze the text. Please tell me what specific help you need with this document.";
            } else {
                reply += " Please let me know what you'd like me to help you with regarding this file.";
            }
            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.AI_CHAT_MESSAGE,
                { fileType, conversationId, blobName: uploadResult.blobName },
                req.user.currentTier,
                req.user.role
            );
            res.json({
                reply,
                conversationId: conversationId || `conv-${Date.now()}`,
                fileProcessed: true,
                blobUrl: uploadResult.url,
                blobName: uploadResult.blobName
            });
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

/**
 * POST /api/ai/quiz/generate
 * Generate quiz from lesson content
 */
router.post(
    '/quiz/generate',
    authenticate,
    aiLimiter,
    [
        body('lessonContent').trim().notEmpty(),
        body('grade').isInt({ min: 1, max: 12 }),
        body('subject').trim().notEmpty(),
        body('numQuestions').optional().isInt({ min: 5, max: 20 }),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { lessonContent, grade, subject, numQuestions } = req.body;

            const quiz = await aiService.generateQuiz(
                req.userId,
                lessonContent,
                grade,
                subject,
                numQuestions || 10
            );

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.AI_QUIZ_GENERATE,
                { quizId: quiz.id, grade, subject },
                req.user.currentTier,
                req.user.role
            );

            res.json(quiz);
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

/**
 * POST /api/ai/grade
 * Grade assignment with AI
 */
router.post(
    '/grade',
    authenticate,
    requireFeature('ai_marking'),
    aiLimiter,
    [
        body('assignmentText').trim().notEmpty(),
        body('rubric').trim().notEmpty(),
        body('maxScore').isInt({ min: 1 }),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { assignmentText, rubric, maxScore } = req.body;

            const grading = await aiService.gradeAssignment(assignmentText, rubric, maxScore);

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.AI_MARKING,
                { score: grading.score, maxScore },
                req.user.currentTier,
                req.user.role
            );

            res.json(grading);
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

/**
 * POST /api/ai/lesson-plan
 * Generate lesson plan
 */
router.post(
    '/lesson-plan',
    authenticate,
    requireFeature('curriculum_planner'),
    aiLimiter,
    [
        body('grade').isInt({ min: 1, max: 12 }),
        body('subject').trim().notEmpty(),
        body('topic').trim().notEmpty(),
        body('duration').isInt({ min: 30, max: 180 }),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { grade, subject, topic, duration } = req.body;

            const lessonPlan = await aiService.generateLessonPlan(grade, subject, topic, duration);

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.AI_CURRICULUM_PLAN,
                { grade, subject, topic },
                req.user.currentTier,
                req.user.role
            );

            res.json({ lessonPlan });
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

export default router;
