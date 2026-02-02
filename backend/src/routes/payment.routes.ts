import { Router, Request, Response } from 'express';
import express from 'express';
import paymentService from '../services/payment.service';
import subscriptionService from '../services/subscription.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { SubscriptionTier } from '../models/user.model';
import { webhookLimiter } from '../middleware/rate-limit.middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import logger from '../config/logger';

const router = Router();

/**
 * POST /api/payments/paystack/webhook
 * Paystack webhook for payment events
 * CRITICAL: Uses raw body for signature verification
 */
router.post(
    '/paystack/webhook',
    express.raw({ type: 'application/json' }),
    webhookLimiter,
    async (req: Request, res: Response) => {
        try {
            // Get signature from header
            const signature = req.headers['x-paystack-signature'] as string;

            if (!signature) {
                logger.warn('Paystack webhook: Missing signature');
                return res.status(400).send('Missing signature');
            }

            // Get raw body as string for signature verification
            const rawBody = req.body.toString('utf8');

            // Verify webhook signature
            const isValid = paymentService.verifyPaystackWebhook(rawBody, signature);
            if (!isValid) {
                logger.warn('Paystack webhook: Invalid signature');
                return res.status(400).send('Invalid signature');
            }

            // Parse the body after verification
            const webhookData = JSON.parse(rawBody);
            const event = webhookData.event;
            const data = webhookData.data;

            logger.info(`Paystack webhook received: ${event}`, {
                event,
                reference: data.reference,
                status: data.status
            });

            // Handle charge.success event
            if (event === 'charge.success') {
                const userId = data.metadata?.user_id;
                const email = data.customer?.email;
                const amount = data.amount; // Amount in kobo
                const reference = data.reference;
                const tier = data.metadata?.tier as SubscriptionTier;

                logger.info(`Processing charge.success for user: ${userId}`, {
                    email,
                    amount,
                    reference,
                    tier
                });

                if (!userId) {
                    logger.error('Paystack webhook: Missing user_id in metadata');
                    return res.status(400).send('Missing user_id');
                }

                if (!tier) {
                    logger.error('Paystack webhook: Missing tier in metadata');
                    return res.status(400).send('Missing tier');
                }

                // Verify the payment amount matches the expected tier price
                const expectedAmount = subscriptionService['getTierPrice'](tier);
                if (amount !== expectedAmount) {
                    logger.error(`Amount mismatch: expected ${expectedAmount}, got ${amount}`);
                    // Still process but log the discrepancy
                }

                try {
                    // Record payment in database
                    await paymentService.recordPayment(
                        userId,
                        'paystack',
                        amount,
                        'success',
                        {
                            reference,
                            email,
                            tier,
                            paystackData: data
                        }
                    );

                    // Activate paid subscription with welcome premium
                    const subscription = await subscriptionService.startPaidSubscription(
                        userId,
                        tier,
                        data.id.toString(), // Paystack transaction ID
                        data.customer?.customer_code || reference
                    );

                    logger.info(`✅ Payment processed successfully for user: ${userId}`, {
                        subscriptionId: subscription.id,
                        tier,
                        amount
                    });

                    // Track analytics
                    await analyticsService.trackEvent(
                        userId,
                        AnalyticsEventType.PAYMENT_SUCCESS,
                        {
                            provider: 'paystack',
                            amount,
                            tier,
                            reference
                        },
                        'unknown',
                        'unknown'
                    );

                } catch (error) {
                    logger.error('Error processing payment:', error);

                    // Record failed payment
                    await paymentService.recordPayment(
                        userId,
                        'paystack',
                        amount,
                        'failed',
                        {
                            reference,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            paystackData: data
                        }
                    );

                    // Don't return error to Paystack, we've logged it
                }
            }

            // Handle subscription.create event
            else if (event === 'subscription.create') {
                logger.info(`Subscription created: ${data.subscription_code}`);
            }

            // Handle subscription.disable event
            else if (event === 'subscription.disable') {
                logger.info(`Subscription disabled: ${data.subscription_code}`);
                const userId = data.customer?.customer_code;

                if (userId) {
                    try {
                        await subscriptionService.cancelSubscription(userId);
                    } catch (error) {
                        logger.error('Error cancelling subscription:', error);
                    }
                }
            }

            // Handle other events
            else {
                logger.info(`Unhandled Paystack event: ${event}`);
            }

            // Always return 200 to Paystack
            res.status(200).send('OK');
            return;

        } catch (error) {
            logger.error('Paystack webhook error:', error);
            // Return 200 even on error to prevent Paystack retries
            res.status(200).send('OK');
            return;
        }
    }
);

/**
 * GET /api/payments/paystack/verify/:reference
 * Verify a Paystack transaction
 */
router.get('/paystack/verify/:reference', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({ error: 'Reference is required' });
        }

        logger.info(`Verifying Paystack transaction: ${reference}`);

        // Verify transaction with Paystack API
        const verification = await paymentService.verifyPaystackTransaction(reference);

        if (!verification) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const response = {
            success: verification.status === 'success',
            reference: verification.reference,
            amount: verification.amount,
            currency: verification.currency,
            status: verification.status,
            paidAt: verification.paid_at,
            customer: {
                email: verification.customer?.email,
            },
            metadata: verification.metadata
        };

        logger.info(`Transaction verified: ${reference}`, { status: verification.status });

        res.json(response);
        return;

    } catch (error) {
        logger.error('Transaction verification error:', error);
        res.status(500).json({
            error: 'Failed to verify transaction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
});

/**
 * POST /api/payments/paystack/initialize
 * Initialize a Paystack payment
 */
router.post('/paystack/initialize', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { email, amount, tier } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!email || !amount || !tier) {
            return res.status(400).json({
                error: 'Missing required fields: email, amount, tier'
            });
        }

        logger.info(`Initializing Paystack payment for user: ${userId}`, {
            email,
            amount,
            tier
        });

        const payment = await paymentService.initializePaystackPayment(
            email,
            amount,
            userId,
            tier
        );

        res.json(payment);
        return;

    } catch (error) {
        logger.error('Payment initialization error:', error);
        res.status(500).json({
            error: 'Failed to initialize payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
});

/**
 * POST /api/payments/payfast/webhook
 * PayFast ITN (Instant Transaction Notification) webhook
 */
router.post('/payfast/webhook', webhookLimiter, async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const signature = data.signature;

        // Verify signature
        const isValid = paymentService.verifyPayFastSignature(data, signature);
        if (!isValid) {
            logger.warn('Invalid PayFast signature');
            return res.status(400).send('Invalid signature');
        }

        const userId = data.m_payment_id;
        const paymentStatus = data.payment_status;
        const amount = parseFloat(data.amount_gross) * 100; // Convert to cents

        // Record payment
        await paymentService.recordPayment(
            userId,
            'payfast',
            amount,
            paymentStatus === 'COMPLETE' ? 'success' : 'failed',
            data
        );

        if (paymentStatus === 'COMPLETE') {
            logger.info(`PayFast payment successful for user ${userId}`);

            await analyticsService.trackEvent(
                userId,
                AnalyticsEventType.PAYMENT_SUCCESS,
                { provider: 'payfast', amount },
                'unknown',
                'unknown'
            );
        } else {
            logger.warn(`PayFast payment failed for user ${userId}`);

            await analyticsService.trackEvent(
                userId,
                AnalyticsEventType.PAYMENT_FAILED,
                { provider: 'payfast', amount },
                'unknown',
                'unknown'
            );
        }

        res.status(200).send('OK');
        return;
    } catch (error) {
        logger.error('PayFast webhook error:', error);
        res.status(500).send('Webhook processing error');
        return;
    }
});

export default router;
