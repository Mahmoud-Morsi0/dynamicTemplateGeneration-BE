import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
    PORT: z.string().transform(Number).default('4000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    STORAGE_DIR: z.string().default('./storage'),
    MAX_UPLOAD_MB: z.string().transform(Number).default('10'),
    DB_URL: z.string().default('file:./storage/app.db'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security').default('your-super-secret-jwt-key-change-in-production'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    // Vercel-specific environment variables
    VERCEL: z.string().optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
})

export const env = envSchema.parse(process.env)
