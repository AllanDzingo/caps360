import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
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

            // Save to Database
            const sql = `
                INSERT INTO users (
                    id, email, password_hash, first_name, last_name, role,
                    grade, subjects, current_tier, trial_premium, welcome_premium,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const values = [
                user.id,
                user.email,
                user.passwordHash,
                user.firstName,
                user.lastName,
                user.role,
                user.grade,
                user.subjects,
                user.currentTier,
                user.trialPremium,
                user.welcomePremium,
                user.createdAt,
                user.updatedAt
            ];

            await query(sql, values);

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
            // Update last login
            await query(
                'UPDATE users SET last_login_at = $1, updated_at = $2 WHERE id = $3',
                [new Date(), new Date(), user.id]
            );

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
            const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
            const data = rows[0];

            if (!data) {
                return null;
            }

            if (!data) {
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
            const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            const data = rows[0];

            // Removed Supabase error check logic


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
            grade: user.grade,
            subjects: user.subjects,
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
