import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    grade?: number;
    currentTier: string;
    effectiveTier: string;
    trialPremium: boolean;
    trialEndDate?: string;
    welcomePremium: boolean;
    welcomePremiumEndDate?: string;
    subjects?: string[];
    enrollmentStatus?: 'active' | 'pending' | 'rejected';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (partialUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                localStorage.setItem('auth_token', token);
                set({ user, token, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem('auth_token');
                set({ user: null, token: null, isAuthenticated: false });
            },
            updateUser: (partialUser) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...partialUser } : null
                }));
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
