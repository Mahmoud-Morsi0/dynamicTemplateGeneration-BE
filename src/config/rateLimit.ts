import { env } from './env'

export const rateLimitConfig = {
    // General API rate limits
    api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 500 : 100, // Higher limit in development
    },

    // Upload-specific rate limits
    upload: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 200 : 50, // Higher limit in development
    },

    // Auth-specific rate limits (for login/register)
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === 'development' ? 100 : 20, // Stricter for auth endpoints
    },

    // Development overrides
    development: {
        enabled: env.NODE_ENV === 'development',
        multiplier: 5, // Multiply limits by 5 in development
    }
}

// Helper function to get rate limit based on environment
export const getRateLimit = (type: 'api' | 'upload' | 'auth') => {
    const config = rateLimitConfig[type]
    const baseLimit = config.max

    if (rateLimitConfig.development.enabled) {
        return baseLimit * rateLimitConfig.development.multiplier
    }

    return baseLimit
}
