import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Tables } from './src/config/supabase';
import { query } from './src/config/database';
import { UserRole, SubscriptionTier } from './src/models/user.model';

async function createAdminUser() {
    console.log('--- STARTING ADMIN CREATION ---');

    try {
        const email = process.env.ADMIN_EMAIL || 'admin@caps360.co.za';
        const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
        const firstName = 'Admin';
        const lastName = 'User';

        // Check if user exists
        console.log(`Checking if ${email} exists...`);
        const { rows: existingUsers } = await query(
            `SELECT id FROM users WHERE email = $1 LIMIT 1`,
            [email]
        );
        if (existingUsers && existingUsers.length > 0) {
            console.log('Admin user already exists, skipping creation.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        const insertSql = `
            INSERT INTO users (
                id, email, password_hash, first_name, last_name, role, current_tier, trial_premium, welcome_premium, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        const insertParams = [
            userId,
            email,
            passwordHash,
            firstName,
            lastName,
            UserRole.ADMIN,
            SubscriptionTier.PREMIUM,
            false,
            false,
            now,
            now
        ];
        console.log('Inserting admin user...');
        await query(insertSql, insertParams);
        console.log('[SUCCESS] Admin user created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[ERROR] Error:', error);
        process.exit(1);
    }
}

createAdminUser();
