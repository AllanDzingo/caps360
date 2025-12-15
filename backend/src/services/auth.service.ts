import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase, Tables } from '../config/supabase';
import config from '../config';
import logger from '../config/logger';
import {
    User,
    SubscriptionTier,
    CreateUserDTO,
    LoginDTO,
    UserResponse,
    UserRole,
} from '../models/user.model';

export class AuthService {
    /**
     * Register a new user
     */
    async register(data: CreateUserDTO): Promise<{ user: UserResponse; token: string }> {
        try {
            // Check if user already exists
            const existingUser = await this.findUserByEmail(data.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(data.password, 10);

            // Create user object
            const userId = uuidv4();
            const now = new Date();

            const user: User = {
                id: userId,
                email: data.email.toLowerCase(),
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                grade: data.grade,
                subjects: data.subjects,
                currentTier: SubscriptionTier.STUDY_HELP, // Default tier
                trialPremium: false,
                welcomePremium: false,
                createdAt: now,
                updatedAt: now,
            };

            // Save to Supabase
            // Note: We need to map camelCase (model) to snake_case (DB) if needed.
            // Assuming the Supabase table has snake_case columns matching the model structure or JSONB.
            // For a relational DB, flat snake_case columns are better.
            const dbUser = {
                id: user.id,
                email: user.email,
                password_hash: user.passwordHash,
                first_name: user.firstName,
                last_name: user.lastName,
                role: user.role,
                grade: user.grade,
                subjects: user.subjects,
                current_tier: user.currentTier,
                trial_premium: user.trialPremium,
                welcome_premium: user.welcomePremium,
                created_at: user.createdAt.toISOString(),
                updated_at: user.updatedAt.toISOString(),
            };

            const { error } = await supabase
                .from(Tables.USERS)
                .insert(dbUser);

            if (error) {
                throw new Error(`Supabase error: ${error.message}`);
            }

            logger.info(`User registered: ${userId} (${data.email})`);

            // Generate JWT token
            const token = this.generateToken(userId);

            return {
                user: this.toUserResponse(user),
                token,
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(data: LoginDTO): Promise<{ user: UserResponse; token: string }> {
        try {
            // Find user by email
            const user = await this.findUserByEmail(data.email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new Error('Invalid email or password');
            }

            // Update last login
            await supabase
                .from(Tables.USERS)
                .update({
                    last_login_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            logger.info(`User logged in: ${user.id} (${user.email})`);

            // Generate JWT token
            const token = this.generateToken(user.id);

            return {
                user: this.toUserResponse(user),
                token,
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from(Tables.USERS)
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                return null;
            }

            return this.mapDbUserToModel(data);
        } catch (error) {
            logger.error('Get user error:', error);
            throw error;
        }
    }

    /**
     * Find user by email
     */
    private async findUserByEmail(email: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from(Tables.USERS)
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw error;
            }

            if (!data) {
                return null;
            }

            return this.mapDbUserToModel(data);
        } catch (error) {
            logger.error('Find user by email error:', error);
            throw error;
        }
    }

    private mapDbUserToModel(dbUser: any): User {
        return {
            id: dbUser.id,
            email: dbUser.email,
            passwordHash: dbUser.password_hash,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            role: dbUser.role as UserRole,
            grade: dbUser.grade,
            subjects: dbUser.subjects,
            childrenIds: dbUser.children_ids,
            subscriptionId: dbUser.subscription_id,
            currentTier: dbUser.current_tier,
            trialPremium: dbUser.trial_premium,
            trialEndDate: dbUser.trial_end_date ? new Date(dbUser.trial_end_date) : undefined,
            welcomePremium: dbUser.welcome_premium,
            welcomePremiumEndDate: dbUser.welcome_premium_end_date ? new Date(dbUser.welcome_premium_end_date) : undefined,
            createdAt: new Date(dbUser.created_at),
            updatedAt: new Date(dbUser.updated_at),
            lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : undefined,
        };
    }

    /**
     * Generate JWT token
     */
    private generateToken(userId: string): string {
        const secret = config.jwt.secret as string;
        return jwt.sign({ userId }, secret, {
            expiresIn: config.jwt.expiresIn,
        } as any);
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): { userId: string } {
        try {
            const secret = config.jwt.secret as string;
            const decoded = jwt.verify(token, secret) as { userId: string };
            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Convert User to UserResponse (remove sensitive data)
     */
    toUserResponse(user: User): UserResponse {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            currentTier: user.currentTier,
            effectiveTier: this.getEffectiveTier(user),
            trialPremium: user.trialPremium,
            trialEndDate: user.trialEndDate?.toISOString(),
            welcomePremium: user.welcomePremium,
            welcomePremiumEndDate: user.welcomePremiumEndDate?.toISOString(),
        };
    }

    /**
     * Get effective tier (considering trial and welcome premium)
     */
    private getEffectiveTier(user: User): SubscriptionTier {
        const now = new Date();

        // Check trial premium
        if (user.trialPremium && user.trialEndDate && user.trialEndDate > now) {
            return SubscriptionTier.PREMIUM;
        }

        // Check welcome premium
        if (user.welcomePremium && user.welcomePremiumEndDate && user.welcomePremiumEndDate > now) {
            return SubscriptionTier.PREMIUM;
        }

        // Return current tier
        return user.currentTier;
    }
}

export default new AuthService();
