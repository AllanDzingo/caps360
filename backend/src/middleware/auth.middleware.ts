import { Request, Response, NextFunction } from 'express';
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

        // Verify token
        const decoded = authService.verifyToken(token);

        // Get user from database
        const user = await authService.getUserById(decoded.userId);

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
    res: Response,
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
