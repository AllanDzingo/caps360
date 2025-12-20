import { supabaseAdmin } from './src/config/supabase';

async function checkTables() {
    console.log('--- CHECKING TABLES ---');
    if (!supabaseAdmin) {
        console.error('❌ Supabase Admin client not initialized.');
        process.exit(1);
    }

    try {
        // There is no easy way to list tables via supabase-js without RPC or raw SQL
        // But we can try to select from 'users' and see if it fails with 'relation does not exist'
        const { error: userError } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });
        if (userError) {
            console.log(`'users' table check result: ${userError.message} (Code: ${userError.code})`);
        } else {
            console.log("'users' table EXISTS.");
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTables();
