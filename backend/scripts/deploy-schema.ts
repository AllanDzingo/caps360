import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Load environment variables
dotenv.config();
// Also try loading .env.production if standard .env is missing or insufficient, but priority to .env
if (fs.existsSync(path.join(__dirname, '../.env.fly'))) {
    dotenv.config({ path: path.join(__dirname, '../.env.fly') });
}

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in environment variables.');
    console.error('Please ensure your .env file contains DATABASE_URL in the format:');
    console.error('postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
    console.error('You can find the connection string in Supabase Dashboard -> Settings -> Database -> Connection string');
    process.exit(1);
}

const schemaPath = path.join(__dirname, '../src/db/schema.sql');

if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function deploySchema() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        console.log('📝 Reading schema.sql...');
        console.log('🚀 Executing schema migration...');

        await client.query(sql);

        console.log('✅ Schema successfully deployed!');
    } catch (error) {
        fs.writeFileSync(path.join(__dirname, 'deployment_log.txt'), `Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        console.error('❌ Error deploying schema:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploySchema();
