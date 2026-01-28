import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL || process.env.AZURE_POSTGRESQL_CONNECTIONSTRING;

export const config = {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv,

    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    ai: {
        azure: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
            apiKey: process.env.AZURE_OPENAI_API_KEY || '',
            deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
            apiVersion: '2024-12-01-preview'
        }
    },

    // Supabase config removed for Azure migration


    database: {
        connectionString: databaseUrl,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        name: process.env.DB_NAME || 'caps360',
        // Default to SSL in production (Azure requires it) but allow override via DB_SSL
        ssl: process.env.DB_SSL ? process.env.DB_SSL === 'true' : nodeEnv === 'production',
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

    azureFunctions: {
        welcomeEmailUrl: process.env.AZURE_WELCOME_EMAIL_FUNCTION_URL || '',
    },
};

export default config;
