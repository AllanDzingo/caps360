import { Pool } from 'pg';
import config from './index';
import logger from './logger';

const sslConfig = config.database.ssl ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({
    // Prefer a single connection string when provided (Azure App Service / Flexible Server)
    ...(config.database.connectionString
        ? { connectionString: config.database.connectionString }
        : {
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.name,
        }),
    ssl: sslConfig,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Event listeners for pool health
pool.on('error', (err, _client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('connect', () => {
    // Optional: Log on successful connection
    // logger.debug('Database connected successfully');
});

/**
 * Query function to execute SQL
 */
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // Log slow queries if needed
        if (duration > 1000) {
            logger.warn('Slow query detected', { text, duration, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        logger.error('Database query error', { text, error });
        throw error;
    }
};

export const getClient = async () => {
    const client = await pool.connect();
    return client;
};

export default {
    query,
    getClient,
    pool
};
