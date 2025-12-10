import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import subscriptionService from '../services/subscription.service';
import paymentService from '../services/payment.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { SubscriptionTier } from '../models/user.model';

const router = Router();

/**
 * POST /api/subscriptions/trial/start
 * Start free trial
 */
router.post('/trial/start', authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await subscriptionService.startFreeTrial(req.userId);

        await analyticsService.trackEvent(
            req.userId,
            AnalyticsEventType.TRIAL_START,
            {},
            'premium',
            req.user.role
        );

        res.json({ message: 'Free trial started', trialDays: 14 });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/subscriptions/paid/start
 * Start paid subscription
 */
router.post(
    '/paid/start',
    authenticate,
    [
        body('tier').isIn(Object.values(SubscriptionTier)),
        body('paystackSubscriptionId').notEmpty(),
        body('paystackCustomerCode').notEmpty(),
    ],
    async (req: AuthRequest, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const subscription = await subscriptionService.startPaidSubscription(
                req.userId,
                req.body.tier,
                req.body.paystackSubscriptionId,
                req.body.paystackCustomerCode
            );

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.SUBSCRIPTION_START,
                { tier: req.body.tier },
                req.body.tier,
                req.user.role
            );

            res.json({ subscription, welcomePremiumDays: 14 });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription
 */
router.post(
    '/upgrade',
    authenticate,
    [body('tier').isIn(Object.values(SubscriptionTier))],
    async (req: AuthRequest, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if (!req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            await subscriptionService.upgradeSubscription(req.userId, req.body.tier);

            await analyticsService.trackEvent(
                req.userId,
                AnalyticsEventType.SUBSCRIPTION_UPGRADE,
                { newTier: req.body.tier },
                req.body.tier,
                req.user.role
            );

            res.json({ message: 'Subscription upgraded' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await subscriptionService.cancelSubscription(req.userId);

        await analyticsService.trackEvent(
            req.userId,
            AnalyticsEventType.SUBSCRIPTION_CANCEL,
            {},
            req.user.currentTier,
            req.user.role
        );

        res.json({ message: 'Subscription cancelled' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
