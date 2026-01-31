import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Connection string from environment variable
const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required.');
}

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
