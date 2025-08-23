import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/auth'

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
        res.status(401).json({ error: 'Access token is required' })
        return
    }

    try {
        const user = verifyToken(token)
        req.user = user
        next()
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' })
        return
    }
}

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (token) {
        try {
            const user = verifyToken(token)
            req.user = user
        } catch (error) {
            // Token is invalid, but continue without user (optional auth)
        }
    }

    next()
}
