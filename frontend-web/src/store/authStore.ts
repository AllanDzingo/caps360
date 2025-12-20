import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    currentTier: string;
    effectiveTier: string;
    trialPremium: boolean;
    trialEndDate?: string;
    welcomePremium: boolean;
    welcomePremiumEndDate?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                set({ user, token, isAuthenticated: true });
            },
            logout: async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('auth_token');
                set({ user: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);

// Initialize Supabase listener
supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
        const user = session.user;
        const mappedUser: User = {
            id: user.id,
            email: user.email || '',
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            role: user.user_metadata?.role || 'student',
            currentTier: user.user_metadata?.current_tier || 'study_help',
            effectiveTier: user.user_metadata?.effective_tier || 'study_help',
            trialPremium: user.user_metadata?.trial_premium || false,
            welcomePremium: user.user_metadata?.welcome_premium || false,
        };
        useAuthStore.getState().setAuth(mappedUser, session.access_token);
        localStorage.setItem('auth_token', session.access_token);
    } else {
        useAuthStore.getState().logout();
    }
});
