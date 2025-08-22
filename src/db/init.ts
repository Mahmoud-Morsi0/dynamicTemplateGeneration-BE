import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'

// Ensure storage directory exists
const storageDir = path.dirname(env.DB_URL.replace('file:', ''))
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
    logger.info('Created storage directory:', storageDir)
}

// Initialize database
const sqlite = new Database(env.DB_URL.replace('file:', ''))
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

// Auto-initialize database in development
if (env.NODE_ENV === 'development') {
    try {
        // Test if tables exist by trying a simple query
        const result = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()

        if (result.length === 0) {
            logger.info('Database appears empty, tables may need to be created')
            logger.info('Run: npm run db:migrate')
        } else {
            logger.info(`Database initialized with ${result.length} tables`)
        }
    } catch (error) {
        logger.error('Database initialization error:', error)
    }
}

export default db