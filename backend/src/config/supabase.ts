import { createClient } from '@supabase/supabase-js';
import config from './index';

if (!config.supabase.url || !config.supabase.anonKey) {
    console.warn('Supabase URL or Key is missing. Database operations will fail.');
}

export const supabase = createClient(
    config.supabase.url,
    config.supabase.anonKey || 'placeholder',
    {
        auth: {
            persistSession: false,
        },
    }
);

// Optional: Admin client for operations requiring service_role key
// export const supabaseAdmin = createClient(...)

export const Tables = {
    USERS: 'users',
    SUBSCRIPTIONS: 'subscriptions',
    COURSES: 'courses',
    LESSONS: 'lessons',
    QUIZZES: 'quizzes',
    ASSIGNMENTS: 'assignments',
    ANALYTICS: 'analytics',
    AI_CONVERSATIONS: 'ai_conversations',
    PAYMENTS: 'payments',
} as const;
