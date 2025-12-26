import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (window as any).__env;
const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL || ((import.meta as any)['env']?.VITE_SUPABASE_URL);
const supabaseAnonKey = runtimeEnv?.VITE_SUPABASE_ANON_KEY || ((import.meta as any)['env']?.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase URL or Anon Key is missing. Check your environment variables.');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Prevent crash if keys are missing, but requests will fail
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);
