import { query } from './src/config/database';

async function checkTables() {
    console.log('--- CHECKING TABLES (PostgreSQL) ---');
    try {
        // Try to select from 'users' table
        await query('SELECT COUNT(*) FROM users');
        console.log("'users' table EXISTS.");
        process.exit(0);
    } catch (err) {
        console.error("'users' table check failed:", err.message || err);
        process.exit(1);
    }
}

checkTables();
