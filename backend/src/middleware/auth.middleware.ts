import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import authService from '../services/auth.service';
import logger from '../config/logger';

export interface AuthRequest extends Request {
    userId?: string;
    user?: any;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        // Verify token (Supabase JWTs are signed with the Supabase JWT secret)
        const secret = config.jwt.secret;
        let decoded: any;

        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            // If local secret fails, log it and fail - we should ensure config.jwt.secret is set to the Supabase JWT secret
            logger.error('JWT Verification failed:', err);
            throw new Error('Invalid or expired token');
        }

        // Supabase JWTs have 'sub' as the user ID
        const userId = decoded.sub || decoded.userId;

        if (!userId) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }

        // Get user from database
        const user = await authService.getUserById(userId);

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        // Attach user to request
        req.userId = user.id;
        req.user = user;

        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = authService.verifyToken(token);
            const user = await authService.getUserById(decoded.userId);

            if (user) {
                req.userId = user.id;
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};
