import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    ai: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    },

    supabase: {
        url: process.env.SUPABASE_URL || 'https://uldvvywrnbzlqdtnmpyk.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_xv62FtlS3pwSH8clF39pMw_wZF3WG7c',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },

    payfast: {
        merchantId: process.env.PAYFAST_MERCHANT_ID || '',
        merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
        passphrase: process.env.PAYFAST_PASSPHRASE || '',
        sandbox: process.env.PAYFAST_SANDBOX === 'true',
    },

    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    },

    subscriptions: {
        studyHelpPrice: parseInt(process.env.STUDY_HELP_PRICE || '3900', 10),
        standardPrice: parseInt(process.env.STANDARD_PRICE || '9900', 10),
        premiumPrice: parseInt(process.env.PREMIUM_PRICE || '14900', 10),
    },

    trial: {
        durationDays: parseInt(process.env.TRIAL_DURATION_DAYS || '14', 10),
        welcomePremiumDays: parseInt(process.env.WELCOME_PREMIUM_DAYS || '14', 10),
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};

export default config;
