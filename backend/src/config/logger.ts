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

// In production, log to Google Cloud Logging
if (config.nodeEnv === 'production') {
    // Cloud Run automatically captures stdout/stderr to Cloud Logging
    logger.add(
        new winston.transports.Console({
            format: winston.format.json(),
        })
    );
}

export default logger;
