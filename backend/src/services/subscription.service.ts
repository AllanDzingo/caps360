import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { supabase, Tables } from '../config/supabase';
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

            const { error } = await supabase
                .from(Tables.USERS)
                .update({
                    trial_premium: true,
                    trial_end_date: trialEndDate.toISOString(),
                    updated_at: now.toISOString(),
                })
                .eq('id', userId);

            if (error) throw new Error(`Supabase error: ${error.message}`);

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

            const dbSubscription = {
                id: subscription.id,
                user_id: subscription.userId,
                tier: subscription.tier,
                status: subscription.status,
                payment_provider: subscription.paymentProvider,
                paystack_subscription_id: subscription.paystackSubscriptionId,
                paystack_customer_code: subscription.paystackCustomerCode,
                amount: subscription.amount,
                currency: subscription.currency,
                billing_cycle: subscription.billingCycle,
                start_date: subscription.startDate.toISOString(),
                next_billing_date: subscription.nextBillingDate?.toISOString(),
                created_at: subscription.createdAt.toISOString(),
                updated_at: subscription.updatedAt.toISOString(),
            };

            // Save subscription
            const { error: subError } = await supabase
                .from(Tables.SUBSCRIPTIONS)
                .insert(dbSubscription);

            if (subError) throw new Error(`Supabase error: ${subError.message}`);

            // Update user with subscription and welcome premium
            const { error: userError } = await supabase
                .from(Tables.USERS)
                .update({
                    subscription_id: subscriptionId,
                    current_tier: tier,
                    welcome_premium: true,
                    welcome_premium_end_date: welcomePremiumEndDate.toISOString(),
                    updated_at: now.toISOString(),
                })
                .eq('id', userId);

            if (userError) throw new Error(`Supabase user update error: ${userError.message}`);

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
            const { data: user, error } = await supabase
                .from(Tables.USERS)
                .select('trial_premium, trial_end_date')
                .eq('id', userId)
                .single();

            if (error || !user || !user.trial_premium) {
                return;
            }

            const now = new Date();

            // Check if trial has actually expired
            if (user.trial_end_date && new Date(user.trial_end_date) > now) {
                return; // Trial still active
            }

            // Set trial_premium to false
            await supabase
                .from(Tables.USERS)
                .update({
                    trial_premium: false,
                    updated_at: now.toISOString(),
                })
                .eq('id', userId);

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
            const { data: user, error } = await supabase
                .from(Tables.USERS)
                .select('welcome_premium, welcome_premium_end_date, current_tier')
                .eq('id', userId)
                .single();

            if (error || !user || !user.welcome_premium) {
                return;
            }

            const now = new Date();

            // Check if welcome premium has actually expired
            if (user.welcome_premium_end_date && new Date(user.welcome_premium_end_date) > now) {
                return; // Welcome premium still active
            }

            // Set welcome_premium to false
            await supabase
                .from(Tables.USERS)
                .update({
                    welcome_premium: false,
                    updated_at: now.toISOString(),
                })
                .eq('id', userId);

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
            const { data: user, error } = await supabase
                .from(Tables.USERS)
                .select('subscription_id')
                .eq('id', userId)
                .single();

            if (error || !user || !user.subscription_id) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription
            const { error: subError } = await supabase
                .from(Tables.SUBSCRIPTIONS)
                .update({
                    tier: newTier,
                    amount: this.getTierPrice(newTier),
                    updated_at: now.toISOString(),
                })
                .eq('id', user.subscription_id);

            if (subError) throw subError;

            // Update user
            const { error: userError } = await supabase
                .from(Tables.USERS)
                .update({
                    current_tier: newTier,
                    updated_at: now.toISOString(),
                })
                .eq('id', userId);

            if (userError) throw userError;

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
            const { data: user, error } = await supabase
                .from(Tables.USERS)
                .select('subscription_id')
                .eq('id', userId)
                .single();

            if (error || !user || !user.subscription_id) {
                throw new Error('No active subscription found');
            }

            const now = new Date();

            // Update subscription status
            await supabase
                .from(Tables.SUBSCRIPTIONS)
                .update({
                    status: SubscriptionStatus.CANCELLED,
                    cancelled_at: now.toISOString(),
                    updated_at: now.toISOString(),
                })
                .eq('id', user.subscription_id);

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
