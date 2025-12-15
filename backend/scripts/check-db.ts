import { Client } from 'pg';

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT to_regclass('public.users');");
        console.log('User table check:', res.rows[0]);

        if (res.rows[0].to_regclass) {
            console.log('✅ Users table exists.');
        } else {
            console.log('❌ Users table does NOT exist.');
            process.exit(1);
        }
    } catch (err) {
        console.error('Error checking DB:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

check();
