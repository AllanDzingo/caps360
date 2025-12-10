import { Router, Request, Response } from 'express';
import paymentService from '../services/payment.service';
import subscriptionService from '../services/subscription.service';
import analyticsService from '../services/analytics.service';
import { AnalyticsEventType } from '../models/analytics.model';
import { webhookLimiter } from '../middleware/rate-limit.middleware';
import logger from '../config/logger';

const router = Router();

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
            // Trial payment successful - convert to paid subscription
            logger.info(`PayFast payment successful for user ${userId}`);

            await analyticsService.trackEvent(
                userId,
                AnalyticsEventType.PAYMENT_SUCCESS,
                { provider: 'payfast', amount },
                'unknown',
                'unknown'
            );

            // TODO: Convert trial to paid subscription
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
    } catch (error) {
        logger.error('PayFast webhook error:', error);
        res.status(500).send('Webhook processing error');
    }
});

/**
 * POST /api/payments/paystack/webhook
 * Paystack webhook for subscription events
 */
router.post('/paystack/webhook', webhookLimiter, async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-paystack-signature'] as string;
        const payload = JSON.stringify(req.body);

        // Verify webhook signature
        const isValid = paymentService.verifyPaystackWebhook(payload, signature);
        if (!isValid) {
            logger.warn('Invalid Paystack signature');
            return res.status(400).send('Invalid signature');
        }

        const event = req.body.event;
        const data = req.body.data;

        logger.info(`Paystack webhook: ${event}`);

        switch (event) {
            case 'subscription.create':
                // Subscription created
                logger.info(`Subscription created: ${data.subscription_code}`);
                break;

            case 'charge.success':
                // Recurring payment successful
                const userId = data.metadata?.user_id;
                const amount = data.amount;

                if (userId) {
                    await paymentService.recordPayment(
                        userId,
                        'paystack',
                        amount,
                        'success',
                        data
                    );

                    await analyticsService.trackEvent(
                        userId,
                        AnalyticsEventType.PAYMENT_SUCCESS,
                        { provider: 'paystack', amount },
                        'unknown',
                        'unknown'
                    );
                }
                break;

            case 'subscription.disable':
                // Subscription cancelled
                logger.info(`Subscription disabled: ${data.subscription_code}`);
                break;

            default:
                logger.info(`Unhandled Paystack event: ${event}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Paystack webhook error:', error);
        res.status(500).send('Webhook processing error');
    }
});

export default router;
