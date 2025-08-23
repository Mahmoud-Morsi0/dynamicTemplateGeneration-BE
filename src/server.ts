import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { logger } from './utils/logger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { apiLimiter, uploadLimiter, devUploadLimiter, authLimiter } from './middleware/rateLimit'
// import { upload } from './middleware/upload'
import templatesRouter from './modules/templates/router'
import authRouter from './modules/auth/auth.routes'

const app = express()

// Security middleware
// app.use(helmet())
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow configured CORS origin from env
        if (origin === env.CORS_ORIGIN) {
            return callback(null, true);
        }

        // Allow all localhost ports and local network IPs in development
        if (env.NODE_ENV === 'development') {
            if (origin.startsWith('http://localhost:') ||
                origin.startsWith('http://127.0.0.1:') ||
                origin.startsWith('http://192.168.') ||
                origin.startsWith('http://10.') ||
                origin.startsWith('http://172.')) {
                return callback(null, true);
            }
        }

        // Allow Vercel preview and production domains
        if (origin.includes('.vercel.app') || origin.includes('.vercel.com')) {
            return callback(null, true);
        }

        // Allow custom domains in production
        if (env.NODE_ENV === 'production') {
            // Add your production domain patterns here
            const allowedDomains: string[] = [
                // Add your custom domains here
                // 'https://yourdomain.com',
                // 'https://www.yourdomain.com'
            ];

            if (allowedDomains.length > 0 && allowedDomains.some(domain => origin.startsWith(domain))) {
                return callback(null, true);
            }
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use('/api', apiLimiter)

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'DynamicFormGen Backend API',
        status: 'running',
        version: '1.0.1',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            templates: '/api/templates/*'
        },
        timestamp: new Date().toISOString()
    })
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authLimiter, authRouter)
// Use development-friendly rate limiter in development mode
const templatesRateLimiter = env.NODE_ENV === 'development' ? devUploadLimiter : uploadLimiter
app.use('/api/templates', templatesRateLimiter, templatesRouter)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server (only in non-serverless environments)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const PORT = env.PORT
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`)
        logger.info(`Environment: ${env.NODE_ENV}`)
        logger.info(`CORS Origin: ${env.CORS_ORIGIN}`)
    })
} else {
    logger.info(`Server configured for serverless deployment`)
    logger.info(`Environment: ${env.NODE_ENV}`)
    logger.info(`CORS Origin: ${env.CORS_ORIGIN}`)
}

// Export for serverless platforms
module.exports = app
export default app
