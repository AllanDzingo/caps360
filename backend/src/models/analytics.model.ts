export enum AnalyticsEventType {
    // User events
    USER_SIGNUP = 'user_signup',
    USER_LOGIN = 'user_login',
    USER_LOGOUT = 'user_logout',

    // Content events
    VIDEO_VIEW = 'video_view',
    VIDEO_COMPLETE = 'video_complete',
    PDF_VIEW = 'pdf_view',
    LESSON_START = 'lesson_start',
    LESSON_COMPLETE = 'lesson_complete',

    // Quiz events
    QUIZ_START = 'quiz_start',
    QUIZ_COMPLETE = 'quiz_complete',
    QUIZ_GENERATE = 'quiz_generate',

    // Assignment events
    ASSIGNMENT_VIEW = 'assignment_view',
    ASSIGNMENT_SUBMIT = 'assignment_submit',
    ASSIGNMENT_GRADE = 'assignment_grade',

    // AI events
    AI_CHAT_MESSAGE = 'ai_chat_message',
    AI_QUIZ_GENERATE = 'ai_quiz_generate',
    AI_MARKING = 'ai_marking',
    AI_CURRICULUM_PLAN = 'ai_curriculum_plan',

    // Subscription events
    SUBSCRIPTION_START = 'subscription_start',
    SUBSCRIPTION_UPGRADE = 'subscription_upgrade',
    SUBSCRIPTION_DOWNGRADE = 'subscription_downgrade',
    SUBSCRIPTION_CANCEL = 'subscription_cancel',
    TRIAL_START = 'trial_start',
    TRIAL_CONVERT = 'trial_convert',

    // Payment events
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',
}

export interface AnalyticsEvent {
    id: string;
    userId: string;
    eventType: AnalyticsEventType;

    // Event metadata
    metadata: Record<string, any>;

    // Context
    userTier: string;
    userRole: string;

    // Timestamp
    timestamp: Date;
}

export interface AIConversation {
    id: string;
    userId: string;

    // Conversation data
    messages: AIMessage[];

    // Metadata
    topic?: string;
    lessonId?: string;

    createdAt: Date;
    updatedAt: Date;
}

export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface PaymentRecord {
    id: string;
    userId: string;
    subscriptionId?: string;

    // Payment details
    provider: 'payfast' | 'paystack';
    amount: number;
    currency: string;
    status: 'pending' | 'success' | 'failed';

    // Provider references
    providerTransactionId?: string;
    providerReference?: string;

    // Metadata
    metadata: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}
