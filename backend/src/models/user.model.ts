export enum UserRole {
    STUDENT = 'student',
    TEACHER = 'teacher',
    PARENT = 'parent',
    ADMIN = 'admin',
}

export enum SubscriptionTier {
    STUDY_HELP = 'study_help',
    STANDARD = 'standard',
    PREMIUM = 'premium',
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
    TRIAL = 'trial',
}

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    grade?: number; // For students
    subjects?: string[]; // For students/teachers
    childrenIds?: string[]; // For parents
    enrollmentStatus?: 'none' | 'pending' | 'active' | 'rejected';

    // Subscription info
    subscriptionId?: string;
    currentTier: SubscriptionTier;

    // Trial & Welcome Premium flags
    trialPremium: boolean;
    trialEndDate?: Date;
    welcomePremium: boolean;
    welcomePremiumEndDate?: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

export interface Subscription {
    id: string;
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;

    // Payment provider info
    paymentProvider: 'payfast' | 'paystack';
    paystackSubscriptionId?: string;
    paystackCustomerCode?: string;

    // Billing
    amount: number; // in cents
    currency: string;
    billingCycle: 'monthly' | 'annual';

    // Dates
    startDate: Date;
    endDate?: Date;
    nextBillingDate?: Date;
    cancelledAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    grade?: number;
    subjects?: string[];
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    currentTier: SubscriptionTier;
    effectiveTier: SubscriptionTier; // Includes trial/welcome premium
    trialPremium: boolean;
    trialEndDate?: string;
    welcomePremium: boolean;
    welcomePremiumEndDate?: string;
    grade?: number;
    subjects?: string[];
    enrollmentStatus?: string;
}
