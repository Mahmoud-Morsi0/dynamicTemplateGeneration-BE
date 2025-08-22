import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { logger } from './utils/logger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { apiLimiter, uploadLimiter } from './middleware/rateLimit'
// import { upload } from './middleware/upload'
import templatesRouter from './modules/templates/router'

const app = express()

// Security middleware
// app.use(helmet())
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow all localhost ports and local network IPs
        if (origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('http://192.168.') ||
            origin.startsWith('http://10.') ||
            origin.startsWith('http://172.')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use('/api', apiLimiter)

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/templates', uploadLimiter, templatesRouter)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const PORT = env.PORT

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`Environment: ${env.NODE_ENV}`)
    logger.info(`CORS Origin: ${env.CORS_ORIGIN}`)
})

export default app
