import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'

let dbInstance: any = null

function initializeDatabase() {
    if (dbInstance) return dbInstance

    try {
        // Check if we're in a serverless environment
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

        if (isServerless) {
            logger.warn('Running in serverless environment - SQLite database will not persist')
            logger.warn('Consider using a cloud database for production (Turso, PlanetScale, Neon, Supabase)')

            // Create in-memory database for serverless
            const sqlite = new Database(':memory:')
            dbInstance = drizzle(sqlite, { schema })

            logger.info('Initialized in-memory SQLite database (data will not persist)')
            return dbInstance
        }

        // Local development setup
        const storageDir = path.dirname(env.DB_URL.replace('file:', ''))
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true })
            logger.info('Created storage directory:', storageDir)
        }

        const sqlite = new Database(env.DB_URL.replace('file:', ''))
        sqlite.pragma('journal_mode = WAL')
        dbInstance = drizzle(sqlite, { schema })

        // Test database in development
        if (env.NODE_ENV === 'development') {
            const result = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
            if (result.length === 0) {
                logger.info('Database appears empty, tables may need to be created')
                logger.info('Run: npm run db:migrate')
            } else {
                logger.info(`Database initialized with ${result.length} tables`)
            }
        }

        return dbInstance
    } catch (error) {
        logger.error('Database initialization error:', error)
        throw error
    }
}

export { initializeDatabase }
export const db = initializeDatabase()

export default db