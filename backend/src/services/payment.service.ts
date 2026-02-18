import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import config from '../config';
import logger from '../config/logger';
import { PaymentRecord } from '../models/analytics.model';

export class PaymentService {

    /**
     * Paystack: Initialize payment transaction
     */
    async initializePaystackPayment(
        email: string,
        amount: number,
        userId: string,
        tier: string
    ): Promise<{ authorization_url: string; access_code: string; reference: string }> {
        try {
            const response = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email,
                    amount, // Amount in kobo (already converted by frontend)
                    currency: 'ZAR',
                    metadata: {
                        user_id: userId,
                        tier,
                        custom_fields: [
                            {
                                display_name: 'User ID',
                                variable_name: 'user_id',
                                value: userId,
                            },
                            {
                                display_name: 'Subscription Tier',
                                variable_name: 'tier',
                                value: tier,
                            },
                        ],
                    },
                    callback_url: 'https://caps360.co.za/payment/success',
                },
                {
                    headers: {
                        Authorization: `Bearer ${config.paystack.secretKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data.status) {
                logger.info(`Paystack payment initialized: ${response.data.data.reference}`);
                return {
                    authorization_url: response.data.data.authorization_url,
                    access_code: response.data.data.access_code,
                    reference: response.data.data.reference,
                };
            }

            throw new Error('Failed to initialize Paystack payment');
        } catch (error) {
            logger.error('Paystack payment initialization error:', error);
            throw error;
        }
    }

    /**
     * Paystack: Create subscription
     */
    async createPaystackSubscription(
        email: string,
        planCode: string,
        userId: string
    ): Promise<{ authorization_url: string; reference: string }> {
        try {
            const response = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email,
                    plan: planCode,
                    metadata: {
                        user_id: userId,
                        custom_fields: [
                            {
                                display_name: 'User ID',
                                variable_name: 'user_id',
                                value: userId,
                            },
                        ],
                    },
                    callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
                },
                {
                    headers: {
                        Authorization: `Bearer ${config.paystack.secretKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data.status) {
                return {
                    authorization_url: response.data.data.authorization_url,
                    reference: response.data.data.reference,
                };
            }

            throw new Error('Failed to create Paystack subscription');
        } catch (error) {
            logger.error('Paystack subscription creation error:', error);
            throw error;
        }
    }

    /**
     * Paystack: Verify transaction
     */
    async verifyPaystackTransaction(reference: string): Promise<any> {
        try {
            const response = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${config.paystack.secretKey}`,
                    },
                }
            );

            if (response.data.status) {
                return response.data.data;
            }

            throw new Error('Failed to verify Paystack transaction');
        } catch (error) {
            logger.error('Paystack verification error:', error);
            throw error;
        }
    }

    /**
     * Paystack: Verify webhook signature
     */
    verifyPaystackWebhook(payload: string, signature: string): boolean {
        const hash = crypto
            .createHmac('sha512', config.paystack.secretKey)
            .update(payload)
            .digest('hex');

        return hash === signature;
    }

    /**
     * Record payment in database
     */
    async recordPayment(
        userId: string,
        provider: 'paystack',
        amount: number,
        status: 'pending' | 'success' | 'failed',
        metadata: Record<string, any>
    ): Promise<PaymentRecord> {
        try {
            const paymentId = uuidv4();
            const payment: PaymentRecord = {
                id: paymentId,
                userId,
                provider,
                amount,
                currency: 'ZAR',
                status,
                metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const dbPayment = {
                id: payment.id,
                user_id: payment.userId,
                provider: payment.provider,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                metadata: payment.metadata,
                created_at: payment.createdAt.toISOString(),
                updated_at: payment.updatedAt.toISOString(),
            };

            const sql = `
                INSERT INTO payments (
                    id, user_id, provider, amount, currency, status, metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;

            const values = [
                dbPayment.id, dbPayment.user_id, dbPayment.provider, dbPayment.amount,
                dbPayment.currency, dbPayment.status, dbPayment.metadata,
                dbPayment.created_at, dbPayment.updated_at
            ];

            await query(sql, values);

            logger.info(`Payment recorded: ${paymentId} (${provider}, ${status})`);

            return payment;
        } catch (error) {
            logger.error('Record payment error:', error);
            throw error;
        }
    }
}

export default new PaymentService();
