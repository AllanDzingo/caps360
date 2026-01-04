
// Supabase DB SDK removed for Azure migration. Auth abstraction will be handled separately.

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
