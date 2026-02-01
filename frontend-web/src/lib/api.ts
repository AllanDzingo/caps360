import axios from 'axios';

// Build API base URL from environment
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const normalizedBase = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : '';

if (!rawApiUrl) {
    if (import.meta.env.PROD) {
        throw new Error('VITE_API_BASE_URL must be set in production. Configure it in your environment variables.');
    }
    console.warn('VITE_API_BASE_URL is not set. Using http://localhost:8080 for development.');
}

// In production, VITE_API_BASE_URL must be set. In dev, use localhost:8080 if not set.
// We keep both for compatibility, but the user requested VITE_API_BASE_URL specifically.
export const API_BASE_URL = normalizedBase || 'http://localhost:8080';
const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth interceptor
api.interceptors.request.use((config) => {
    // Get token from localStorage directly to avoid circular dependency with store
    // or use store.getState().token if imported cautiously
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Subject {
    id: string;
    title: string;
    description: string;
    grade: number;
    subject: string;
    thumbnailUrl?: string;
    accessTier: string;
}

export interface ProgressMap {
    [courseId: string]: number; // percent complete
}

export const contentApi = {
    getDashboard: async (grade?: number) => {
        const params = grade ? { grade } : {};
        const response = await api.get<{ success: boolean; data: Subject[] }>('/dashboard', { params });
        return response.data.data;
    },
    getSubject: async (id: string) => {
        const response = await api.get<{ success: boolean; data: any }>('/subjects/' + id);
        return response.data.data;
    },
    getTopic: async (id: string) => {
        const response = await api.get<{ success: boolean; data: any }>('/content/topics/' + id);
        return response.data.data;
    }
};

export const progressApi = {
    getDashboardProgress: async (userId: string) => {
        const response = await api.get<{ success: boolean; data: ProgressMap }>('/progress/dashboard', { params: { userId } });
        return response.data.data;
    },
    startLesson: async (userId: string, lessonId: string) => {
        await api.post(`/progress/lessons/${lessonId}/start`, { userId });
    },
    completeLesson: async (userId: string, lessonId: string, quizScore: number) => {
        await api.post(`/progress/lessons/${lessonId}/complete`, { userId, quizScore });
    }
};

export const subscriptionAPI = {
    // Placeholder - will implement properly later
    getSubscriptions: async () => [],
    subscribe: async (plan: string) => { console.log('Subscribe', plan); },
    startTrial: async () => { console.log('Start Trial'); }
};

export default api;
