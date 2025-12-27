import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin, Tables } from './src/config/supabase';
import { UserRole, SubscriptionTier } from './src/models/user.model';

async function createAdminUser() {
    console.log('--- STARTING ADMIN CREATION ---');
    if (!supabaseAdmin) {
        console.error('[ERROR] Supabase Admin client not initialized.');
        process.exit(1);
    }

    try {
        const email = process.env.ADMIN_EMAIL || 'admin@caps360.co.za';
        const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
        const firstName = 'Admin';
        const lastName = 'User';

        // Check if user exists
        console.log(`Checking if ${email} exists...`);
        const { data: existingUser } = await supabaseAdmin
            .from(Tables.USERS)
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('Admin user already exists, skipping creation.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        const dbUser = {
            id: userId,
            email: email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            role: UserRole.ADMIN,
            current_tier: SubscriptionTier.PREMIUM,
            trial_premium: false,
            welcome_premium: false,
            created_at: now,
            updated_at: now
        };

        console.log('Inserting admin user...');
        const { error } = await supabaseAdmin
            .from(Tables.USERS)
            .insert(dbUser);

        if (error) {
            throw new Error(error.message);
        }

        console.log('[SUCCESS] Admin user created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[ERROR] Error:', error);
        process.exit(1);
    }
}

createAdminUser();
