import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (window as any).__env;
const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL || ((import.meta as any)['env']?.VITE_SUPABASE_URL);
const supabaseAnonKey = runtimeEnv?.VITE_SUPABASE_ANON_KEY || ((import.meta as any)['env']?.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
