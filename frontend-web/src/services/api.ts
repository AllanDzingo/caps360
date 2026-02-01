import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Maintain current authentication logic
api.interceptors.request.use((config) => {
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
        const response = await api.get<{ success: boolean; data: any }>('/topics/' + id);
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
    getSubscriptions: async () => [],
    subscribe: async (plan: string) => { console.log('Subscribe', plan); },
    startTrial: async () => { console.log('Start Trial'); }
};

export default api;
