import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import subscriptionService from '../services/subscription.service';
import { SubscriptionTier } from '../models/user.model';

/**
 * Middleware to enforce tier-based access control
 */
export const requireTier = (requiredTier: SubscriptionTier) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const hasAccess = subscriptionService.hasAccess(req.user, requiredTier);

            if (!hasAccess) {
                res.status(403).json({
                    error: 'Insufficient subscription tier',
                    required: requiredTier,
                    current: subscriptionService.getUserAccessLevel(req.user),
                    message: `This feature requires ${requiredTier} tier or higher. Please upgrade your subscription.`,
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({ error: 'Access control error' });
        }
    };
};

/**
 * Middleware to check specific feature access
 */
export const requireFeature = (featureName: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const userTier = subscriptionService.getUserAccessLevel(req.user);

            // Define feature access rules
            const featureAccess: Record<string, SubscriptionTier> = {
                'ai_tutor': SubscriptionTier.STANDARD,
                'quiz_unlimited': SubscriptionTier.STANDARD,
                'teacher_portal': SubscriptionTier.PREMIUM,
                'parent_dashboard': SubscriptionTier.PREMIUM,
                'curriculum_planner': SubscriptionTier.PREMIUM,
                'ai_marking': SubscriptionTier.PREMIUM,
            };

            const requiredTier = featureAccess[featureName];

            if (!requiredTier) {
                // Feature not restricted
                next();
                return;
            }

            const hasAccess = subscriptionService.hasAccess(req.user, requiredTier);

            if (!hasAccess) {
                res.status(403).json({
                    error: 'Feature not available',
                    feature: featureName,
                    required: requiredTier,
                    current: userTier,
                    message: `${featureName} requires ${requiredTier} tier. Please upgrade.`,
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({ error: 'Feature access error' });
        }
    };
};
