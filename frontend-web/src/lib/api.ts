import axios from 'axios';

// Prefer runtime-injected env (window.__env) if present, else fall back to compile-time Vite env
const runtimeEnv = (window as any).__env;
const API_URL = runtimeEnv?.VITE_API_URL || ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8080';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
};

// Subscription API
export const subscriptionAPI = {
    startTrial: () => api.post('/subscriptions/trial/start'),
    startPaid: (data: any) => api.post('/subscriptions/paid/start', data),
    upgrade: (tier: string) => api.post('/subscriptions/upgrade', { tier }),
    cancel: () => api.post('/subscriptions/cancel'),
};

// AI API
export const aiAPI = {
    chat: (data: any) => api.post('/ai/chat', data),
    generateQuiz: (data: any) => api.post('/ai/quiz/generate', data),
    gradeAssignment: (data: any) => api.post('/ai/grade', data),
    generateLessonPlan: (data: any) => api.post('/ai/lesson-plan', data),
};

// Content API
export const contentAPI = {
    getCourses: (params?: any) => api.get('/content/courses', { params }),
    getCourse: (id: string) => api.get(`/content/courses/${id}`),
    getLessons: (courseId: string) => api.get(`/content/courses/${courseId}/lessons`),
    getLesson: (id: string) => api.get(`/content/lessons/${id}`),
};

export default api;
