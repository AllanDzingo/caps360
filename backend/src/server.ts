import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { query } from './config/database';
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
import progressRoutes from './routes/progress.routes';
import contentController from './controllers/content.controller';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration for frontend
// Production domains must be explicitly added for browser CORS to work
const allowedOrigins = [
    // Custom domain
    'https://www.caps360.co.za',
    'https://caps360.co.za',
    // Azure Static Web Apps
    'https://mango-sky-09623131e.1.azurestaticapps.net',
    // Production backend (for completeness if hitting its root)
    'https://caps360-backend-prod-gehwe9edcxcqdffm.southafricanorth-01.azurewebsites.net',
    // Development
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173', // Vite default port
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
    maxAge: 86400, // Cache CORS preflight for 24 hours to reduce repeated checks
};

// Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

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

// Health check endpoint (for Azure App Service)
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
app.use('/api/progress', progressRoutes);
app.get('/api/subjects', (req, res) => contentController.getSubjects(req, res));
app.get('/api/dashboard', (req, res) => contentController.getDashboard(req, res));
app.get('/api/topics/:id', (req, res) => contentController.getTopic(req, res));

// Production aliases
app.get('/subjects', (req, res) => contentController.getSubjects(req, res));
app.get('/dashboard', (req, res) => contentController.getDashboard(req, res));
import { authenticate, AuthRequest } from './middleware/auth.middleware';
import authService from './services/auth.service';

app.get('/users/me', authenticate, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ user: authService.toUserResponse(req.user) });
});
app.get('/api/users/me', authenticate, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ user: authService.toUserResponse(req.user) });
});

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
const PORT = Number(process.env.PORT) || Number(config.port) || 8080;

// Check database connection
async function checkDatabaseConnection() {
    try {
        await query('SELECT 1');
        logger.info('✅ Database connected successfully');
    } catch (error) {
        logger.error('❌ Database connection error:', error);
        // We might not want to exit process here in case of transient errors, but for now let's just log it.
    }
}

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 CAPS360 API server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);

    // Fire-and-forget DB check
    checkDatabaseConnection().catch(err => {
        logger.error('Database check failed:', err);
    });
});

export default app;
