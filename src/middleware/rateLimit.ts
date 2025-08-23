import rateLimit from 'express-rate-limit'
import { rateLimitConfig, getRateLimit } from '../config/rateLimit'

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: rateLimitConfig.api.windowMs,
    max: getRateLimit('api'),
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Upload-specific rate limiter (more permissive for file uploads)
export const uploadLimiter = rateLimit({
    windowMs: rateLimitConfig.upload.windowMs,
    max: getRateLimit('upload'),
    message: {
        error: 'Too many uploads from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Development-friendly rate limiter (for testing)
export const devUploadLimiter = rateLimit({
    windowMs: rateLimitConfig.upload.windowMs,
    max: 200, // Much higher limit for development
    message: {
        error: 'Too many uploads from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Strict rate limiter (for production if needed)
export const strictUploadLimiter = rateLimit({
    windowMs: rateLimitConfig.upload.windowMs,
    max: 20, // Lower limit for strict environments
    message: {
        error: 'Too many uploads from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Auth-specific rate limiter
export const authLimiter = rateLimit({
    windowMs: rateLimitConfig.auth.windowMs,
    max: getRateLimit('auth'),
    message: {
        error: 'Too many authentication attempts from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})
