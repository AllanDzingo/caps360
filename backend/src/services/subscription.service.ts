import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { getFirestore, Collections } from '../config/firestore';
import config from '../config';
import logger from '../config/logger';
import {
    User,
    Subscription,
    SubscriptionTier,
    SubscriptionStatus,
} from '../models/user.model';

export class SubscriptionService {
    private db = getFirestore();

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

            await this.db.collection(Collections.USERS).doc(userId).update({
                trialPremium: true,
                trialEndDate,
                updatedAt: now,
            });

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

            await this.db.collection(Collections.SUBSCRIPTIONS).doc(subscriptionId).set(subscription);

            // Update user with subscription and welcome premium
            await this.db.collection(Collections.USERS).doc(userId).update({
                subscriptionId,
                currentTier: tier,
                welcomePremium: true,
                welcomePremiumEndDate,
                updatedAt: now,
            });

            logger.info(`Paid subscription started for user: ${userId}, tier: ${tier}`);

            return subscription;
        } catch (error) {
            logger.error('Start paid subscription error:', error);
            throw error;
        }
    }

    /**
     * Handle trial expiry
     * Called by Cloud Function when trial ends
     */
    async handleTrialExpiry(userId: string): Promise<void> {
        try {
            const userDoc = await this.db.collection(Collections.USERS).doc(userId).get();
            const user = userDoc.data() as User;

            if (!user || !user.trialPremium) {
                return;
            }

            const now = new Date();

            // Check if trial has actually expired
            if (user.trialEndDate && user.trialEndDate > now) {
                return; // Trial still active
            }

            // Set trial_premium to false
            await this.db.collection(Collections.USERS).doc(userId).update({
                trialPremium: false,
                updatedAt: now,
            });

            logger.info(`Trial expired for user: ${userId}`);

            // TODO: Send payment reminder email
            // TODO: Trigger PayFast payment request
        } catch (error) {
            logger.error('Handle trial expiry error:', error);
            throw error;
        }
    }

    /**
     * Handle welcome premium expiry
     * Called by Cloud Function after 14 days of paid subscription
     */
    async handleWelcomePremiumExpiry(userId: string): Promise<void> {
        try {
            const userDoc = await this.db.collection(Collections.USERS).doc(userId).get();
            const user = userDoc.data() as User;

            if (!user || !user.welcomePremium) {
                return;
            }

            const now = new Date();

            // Check if welcome premium has actually expired
            if (user.welcomePremiumEndDate && user.welcomePremiumEndDate > now) {
                return; // Welcome premium still active
            }

            // Set welcome_premium to false
            await this.db.collection(Collections.USERS).doc(userId).update({
                welcomePremium: false,
                updatedAt: now,
            });

            logger.info(`Welcome premium expired for user: ${userId}, reverted to tier: ${user.currentTier}`);

            // TODO: Send notification about tier reversion
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
            const userDoc = await this.db.collection(Collections.USERS).doc(userId).get();
            const user = userDoc.data() as User;

            if (!user || !user.subscriptionId) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription
            await this.db.collection(Collections.SUBSCRIPTIONS).doc(user.subscriptionId).update({
                tier: newTier,
                amount: this.getTierPrice(newTier),
                updatedAt: now,
            });

            // Update user
            await this.db.collection(Collections.USERS).doc(userId).update({
                currentTier: newTier,
                updatedAt: now,
            });

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
            const userDoc = await this.db.collection(Collections.USERS).doc(userId).get();
            const user = userDoc.data() as User;

            if (!user || !user.subscriptionId) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription status
            await this.db.collection(Collections.SUBSCRIPTIONS).doc(user.subscriptionId).update({
                status: SubscriptionStatus.CANCELLED,
                cancelledAt: now,
                updatedAt: now,
            });

            logger.info(`Subscription cancelled for user: ${userId}`);

            // TODO: Cancel Paystack subscription
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
