import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { supabase, Tables } from './config/supabase';
import config from './config';
import logger from './config/logger';
import { requestLogger, errorLogger } from './middleware/logging.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import aiRoutes from './routes/ai.routes';
import contentRoutes from './routes/content.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration for frontend
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://caps360-frontend.fly.dev',
];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(requestLogger);

// Rate limiting (except for webhooks)
app.use('/api', (req, res, next) => {
    if (req.path.includes('/webhooks') || req.path.includes('/webhook')) {
        return next();
    }
    return apiLimiter(req, res, next);
});

// Health check endpoint (for Cloud Run)
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint - helpful for browsers visiting the app root
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        message: 'CAPS360 API. Visit /health or /api for endpoints',
        health: '/health',
        apiRoot: '/api',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/content', contentRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use(errorLogger);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
});

// Start server
const PORT = config.port;

// Check database connection
async function checkDatabaseConnection() {
    try {
        const { error } = await supabase.from(Tables.USERS).select('count', { count: 'exact', head: true });
        if (error) {
            logger.error('❌ Supabase connection failed:', error.message);
            // We might not want to exit process here in case of transient errors, but for now let's just log it.
        } else {
            logger.info('✅ Supabase connected successfully');
        }
    } catch (error) {
        logger.error('❌ Supabase connection error:', error);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`🚀 CAPS360 API server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);

    await checkDatabaseConnection();
});

export default app;
