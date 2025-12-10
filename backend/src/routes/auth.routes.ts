import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/auth.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
    '/register',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').trim().notEmpty(),
        body('lastName').trim().notEmpty(),
        body('role').isIn(Object.values(UserRole)),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const result = await authService.register(req.body);

            // Track signup event
            await analyticsService.trackEvent(
                result.user.id,
                AnalyticsEventType.USER_SIGNUP,
                { role: req.body.role },
                result.user.currentTier,
                req.body.role
            );

            res.status(201).json(result);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
    '/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const result = await authService.login(req.body);

            // Track login event
            await analyticsService.trackEvent(
                result.user.id,
                AnalyticsEventType.USER_LOGIN,
                {},
                result.user.currentTier,
                result.user.role
            );

            res.json(result);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
);

export default router;
