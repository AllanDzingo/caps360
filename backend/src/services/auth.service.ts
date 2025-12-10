import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Collections } from '../config/firestore';
import config from '../config';
import logger from '../config/logger';
import {
    User,
    SubscriptionTier,
    CreateUserDTO,
    LoginDTO,
    UserResponse,
} from '../models/user.model';

export class AuthService {
    private db = getFirestore();

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

            // Save to Firestore
            await this.db.collection(Collections.USERS).doc(userId).set(user);

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
            await this.db.collection(Collections.USERS).doc(user.id).update({
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            });

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
            const doc = await this.db.collection(Collections.USERS).doc(userId).get();
            if (!doc.exists) {
                return null;
            }
            return doc.data() as User;
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
            const snapshot = await this.db
                .collection(Collections.USERS)
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            return snapshot.docs[0].data() as User;
        } catch (error) {
            logger.error('Find user by email error:', error);
            throw error;
        }
    }

    /**
     * Generate JWT token
     */
    private generateToken(userId: string): string {
        const secret = config.jwt.secret as string;
        return jwt.sign({ userId }, secret, {
            expiresIn: config.jwt.expiresIn,
        });
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
