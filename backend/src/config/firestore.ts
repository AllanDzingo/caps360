import { Firestore } from '@google-cloud/firestore';
import config from './index';

let firestoreInstance: Firestore | null = null;

export const getFirestore = (): Firestore => {
    if (!firestoreInstance) {
        firestoreInstance = new Firestore({
            projectId: config.gcp.projectId,
            // In development, uses FIRESTORE_EMULATOR_HOST if set
        });
    }
    return firestoreInstance;
};

export const Collections = {
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

export default getFirestore;
