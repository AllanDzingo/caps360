import winston from 'winston';
import config from './index';

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'caps360-api' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// In production, log to console as JSON for better log parsing by hosting providers (Fly.io, etc.)
if (config.nodeEnv === 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.json(),
        })
    );
}

export default logger;
