import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 uploads per windowMs
    message: {
        error: 'Too many uploads from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})
