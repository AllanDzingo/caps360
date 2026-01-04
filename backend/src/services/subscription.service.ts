import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { query } from '../config/database';
import config from '../config';
import logger from '../config/logger';
import {
    User,
    Subscription,
    SubscriptionTier,
    SubscriptionStatus,
} from '../models/user.model';

export class SubscriptionService {
    /**
     * Get user's effective access level
     * Considers trial_premium and welcome_premium flags
     */
    getUserAccessLevel(user: User): SubscriptionTier {
        const now = new Date();

        // Check trial premium (highest priority)
        if (user.trialPremium && user.trialEndDate && user.trialEndDate > now) {
            return SubscriptionTier.PREMIUM;
        }

        // Check welcome premium
        if (user.welcomePremium && user.welcomePremiumEndDate && user.welcomePremiumEndDate > now) {
            return SubscriptionTier.PREMIUM;
        }

        // Return purchased tier
        return user.currentTier;
    }

    /**
     * Start free trial (14 days of Premium access)
     */
    async startFreeTrial(userId: string): Promise<void> {
        try {
            const now = new Date();
            const trialEndDate = addDays(now, config.trial.durationDays);

            await query(
                'UPDATE users SET trial_premium = $1, trial_end_date = $2, updated_at = $3 WHERE id = $4',
                [true, trialEndDate.toISOString(), now.toISOString(), userId]
            );

            logger.info(`Free trial started for user: ${userId}, ends: ${trialEndDate}`);
        } catch (error) {
            logger.error('Start free trial error:', error);
            throw error;
        }
    }

    /**
     * Start paid subscription with welcome premium
     */
    async startPaidSubscription(
        userId: string,
        tier: SubscriptionTier,
        paystackSubscriptionId: string,
        paystackCustomerCode: string
    ): Promise<Subscription> {
        try {
            const now = new Date();
            const welcomePremiumEndDate = addDays(now, config.trial.welcomePremiumDays);

            // Create subscription record
            const subscriptionId = uuidv4();
            const subscription: Subscription = {
                id: subscriptionId,
                userId,
                tier,
                status: SubscriptionStatus.ACTIVE,
                paymentProvider: 'paystack',
                paystackSubscriptionId,
                paystackCustomerCode,
                amount: this.getTierPrice(tier),
                currency: 'ZAR',
                billingCycle: 'monthly',
                startDate: now,
                nextBillingDate: addDays(now, 30),
                createdAt: now,
                updatedAt: now,
            };



            // Save subscription
            // Save subscription
            const subSql = `
                INSERT INTO subscriptions (
                    id, user_id, tier, status, payment_provider,
                    paystack_subscription_id, paystack_customer_code,
                    amount, currency, billing_cycle,
                    start_date, next_billing_date,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;

            const subValues = [
                subscription.id,
                subscription.userId,
                subscription.tier,
                subscription.status,
                subscription.paymentProvider,
                subscription.paystackSubscriptionId,
                subscription.paystackCustomerCode,
                subscription.amount,
                subscription.currency,
                subscription.billingCycle,
                subscription.startDate.toISOString(),
                subscription.nextBillingDate?.toISOString(),
                subscription.createdAt.toISOString(),
                subscription.updatedAt.toISOString()
            ];

            await query(subSql, subValues);

            // Update user with subscription and welcome premium
            // Update user with subscription and welcome premium
            await query(
                `UPDATE users SET
                    subscription_id = $1,
                    current_tier = $2,
                    welcome_premium = $3,
                    welcome_premium_end_date = $4,
                    updated_at = $5
                WHERE id = $6`,
                [
                    subscriptionId,
                    tier,
                    true,
                    welcomePremiumEndDate.toISOString(),
                    now.toISOString(),
                    userId
                ]
            );

            logger.info(`Paid subscription started for user: ${userId}, tier: ${tier}`);

            return subscription;
        } catch (error) {
            logger.error('Start paid subscription error:', error);
            throw error;
        }
    }

    /**
     * Handle trial expiry
     */
    async handleTrialExpiry(userId: string): Promise<void> {
        try {
            const { rows } = await query('SELECT trial_premium, trial_end_date FROM users WHERE id = $1', [userId]);
            const user = rows[0];

            if (!user || !user.trial_premium) {
                return;
            }

            const now = new Date();

            // Check if trial has actually expired (Postgres driver returns Date objects for timestamps)
            if (user.trial_end_date && new Date(user.trial_end_date) > now) {
                return; // Trial still active
            }

            // Set trial_premium to false
            await query(
                'UPDATE users SET trial_premium = $1, updated_at = $2 WHERE id = $3',
                [false, now.toISOString(), userId]
            );

            logger.info(`Trial expired for user: ${userId}`);
        } catch (error) {
            logger.error('Handle trial expiry error:', error);
            throw error;
        }
    }

    /**
     * Handle welcome premium expiry
     */
    async handleWelcomePremiumExpiry(userId: string): Promise<void> {
        try {
            const { rows } = await query('SELECT welcome_premium, welcome_premium_end_date, current_tier FROM users WHERE id = $1', [userId]);
            const user = rows[0];

            if (!user || !user.welcome_premium) {
                return;
            }

            const now = new Date();

            // Check if welcome premium has actually expired
            if (user.welcome_premium_end_date && new Date(user.welcome_premium_end_date) > now) {
                return; // Welcome premium still active
            }

            // Set welcome_premium to false
            await query(
                'UPDATE users SET welcome_premium = $1, updated_at = $2 WHERE id = $3',
                [false, now.toISOString(), userId]
            );

            logger.info(`Welcome premium expired for user: ${userId}, reverted to tier: ${user.current_tier}`);
        } catch (error) {
            logger.error('Handle welcome premium expiry error:', error);
            throw error;
        }
    }

    /**
     * Upgrade subscription
     */
    async upgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<void> {
        try {
            // Get user to find subscription ID
            const { rows } = await query('SELECT subscription_id FROM users WHERE id = $1', [userId]);
            const user = rows[0];

            if (!user || !user.subscription_id) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription
            await query(
                'UPDATE subscriptions SET tier = $1, amount = $2, updated_at = $3 WHERE id = $4',
                [newTier, this.getTierPrice(newTier), now.toISOString(), user.subscription_id]
            );

            // Update user
            await query(
                'UPDATE users SET current_tier = $1, updated_at = $2 WHERE id = $3',
                [newTier, now.toISOString(), userId]
            );

            logger.info(`Subscription upgraded for user: ${userId}, new tier: ${newTier}`);
        } catch (error) {
            logger.error('Upgrade subscription error:', error);
            throw error;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: string): Promise<void> {
        try {
            const { rows } = await query('SELECT subscription_id FROM users WHERE id = $1', [userId]);
            const user = rows[0];

            if (!user || !user.subscription_id) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription status
            await query(
                'UPDATE subscriptions SET status = $1, cancelled_at = $2, updated_at = $3 WHERE id = $4',
                [SubscriptionStatus.CANCELLED, now.toISOString(), now.toISOString(), user.subscription_id]
            );

            logger.info(`Subscription cancelled for user: ${userId}`);
        } catch (error) {
            logger.error('Cancel subscription error:', error);
            throw error;
        }
    }

    /**
     * Get tier price in cents
     */
    private getTierPrice(tier: SubscriptionTier): number {
        switch (tier) {
            case SubscriptionTier.STUDY_HELP:
                return config.subscriptions.studyHelpPrice;
            case SubscriptionTier.STANDARD:
                return config.subscriptions.standardPrice;
            case SubscriptionTier.PREMIUM:
                return config.subscriptions.premiumPrice;
            default:
                return 0;
        }
    }

    /**
     * Check if user has access to a feature based on required tier
     */
    hasAccess(user: User, requiredTier: SubscriptionTier): boolean {
        const effectiveTier = this.getUserAccessLevel(user);

        const tierHierarchy = {
            [SubscriptionTier.STUDY_HELP]: 1,
            [SubscriptionTier.STANDARD]: 2,
            [SubscriptionTier.PREMIUM]: 3,
        };

        return tierHierarchy[effectiveTier] >= tierHierarchy[requiredTier];
    }
}

export default new SubscriptionService();
