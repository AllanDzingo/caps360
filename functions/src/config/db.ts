import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        // console.log(`executed query: { text: ${text}, duration: ${Date.now() - start}ms, rows: ${res.rowCount} }`);
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

export default pool;
