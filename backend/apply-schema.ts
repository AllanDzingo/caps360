import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Connection string from user input
const connectionString = 'postgresql://postgres:Dzingo.33636@db.uldvvywrnbzlqdtnmpyk.supabase.co:5432/postgres';

async function applySchema() {
    console.log('--- APPLYING SCHEMA ---');

    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const schemaPath = path.join(__dirname, 'src/db/schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Schema read successfully.');

        // Execute schema
        console.log('Executing SQL...');
        await client.query(schemaSql);

        console.log('✅ Schema applied successfully!');
    } catch (error) {
        console.error('❌ Error applying schema:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applySchema();
