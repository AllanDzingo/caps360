import { query } from '../config/database';
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/auth.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import logger from '../config/logger';
import { sendWelcomeEmail } from '../services/email.service';

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

            // Trigger welcome email (Azure Function)
            // Log before sending welcome email
            logger.info(`Triggering welcome email for user ${result.user.email}`);
            sendWelcomeEmail({
                to: result.user.email,
                firstName: result.user.firstName
            });

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

/**
 * PATCH /api/auth/profile
 * Update user profile (subjects, grade, etc.)
 */
router.patch(
    '/profile',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { subjects, grade } = req.body;
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (subjects !== undefined) {
                updates.push(`subjects = $${paramIndex++}`);
                values.push(subjects);
            }

            if (grade !== undefined) {
                updates.push(`grade = $${paramIndex++}`);
                values.push(grade);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            updates.push(`updated_at = NOW()`);
            values.push(req.userId);

            const updateQuery = `
                UPDATE users 
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING id, email, first_name, last_name, role, grade, subjects, current_tier, trial_premium, trial_end_date, welcome_premium, welcome_premium_end_date
            `;

            const result = await query(updateQuery, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const dbUser = result.rows[0];
            // @ts-ignore - mapDbUserToModel expects full user but we have enough for response
            const responseUser = authService.toUserResponse(authService.mapDbUserToModel(dbUser));

            res.json({ user: responseUser });
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
);

export default router;
