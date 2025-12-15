import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { supabase, Tables } from '../config/supabase';
import config from '../config';
import logger from '../config/logger';
import { PaymentRecord } from '../models/analytics.model';

export class PaymentService {
    /**
     * PayFast: Generate payment URL for trial payment capture
     */
    generatePayFastPaymentUrl(userId: string, amount: number, itemName: string): string {
        const merchantId = config.payfast.merchantId;
        const merchantKey = config.payfast.merchantKey;
        const returnUrl = `${process.env.FRONTEND_URL}/payment/success`;
        const cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel`;
        const notifyUrl = `${process.env.API_URL}/api/payments/payfast/webhook`;

        const data: Record<string, string> = {
            merchant_id: merchantId,
            merchant_key: merchantKey,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            notify_url: notifyUrl,
            name_first: 'CAPS360',
            name_last: 'User',
            email_address: 'user@caps360.co.za',
            m_payment_id: userId,
            amount: (amount / 100).toFixed(2), // Convert cents to rands
            item_name: itemName,
        };

        // Generate signature
        const signature = this.generatePayFastSignature(data);
        data.signature = signature;

        // Build query string
        const queryString = Object.keys(data)
            .map(key => `${key}=${encodeURIComponent(data[key])}`)
            .join('&');

        const baseUrl = config.payfast.sandbox
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process';

        return `${baseUrl}?${queryString}`;
    }

    /**
     * PayFast: Verify webhook signature
     */
    verifyPayFastSignature(data: Record<string, string>, signature: string): boolean {
        const generatedSignature = this.generatePayFastSignature(data);
        return generatedSignature === signature;
    }

    /**
     * PayFast: Generate MD5 signature
     */
    private generatePayFastSignature(data: Record<string, string>): string {
        // Create parameter string
        let paramString = '';
        const sortedKeys = Object.keys(data).sort();

        for (const key of sortedKeys) {
            if (key !== 'signature') {
                paramString += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
            }
        }

        // Remove last ampersand
        paramString = paramString.slice(0, -1);

        // Add passphrase if set
        if (config.payfast.passphrase) {
            paramString += `&passphrase=${encodeURIComponent(config.payfast.passphrase.trim()).replace(/%20/g, '+')}`;
        }

        return crypto.createHash('md5').update(paramString).digest('hex');
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
        provider: 'payfast' | 'paystack',
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

            const { error } = await supabase
                .from(Tables.PAYMENTS)
                .insert(dbPayment);

            if (error) {
                throw new Error(`Supabase error: ${error.message}`);
            }

            logger.info(`Payment recorded: ${paymentId} (${provider}, ${status})`);

            return payment;
        } catch (error) {
            logger.error('Record payment error:', error);
            throw error;
        }
    }
}

export default new PaymentService();
