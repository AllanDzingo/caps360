import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
app.use(cors());

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
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/content', contentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use(errorLogger);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`🚀 CAPS360 API server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`GCP Project: ${config.gcp.projectId}`);
});

export default app;
