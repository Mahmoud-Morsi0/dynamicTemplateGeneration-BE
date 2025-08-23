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
            
            // Create tables automatically in serverless environment
            try {
                sqlite.exec(`
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT NOT NULL UNIQUE,
                        name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at INTEGER NOT NULL,
                        updated_at INTEGER NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS templates (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL REFERENCES users(id),
                        name TEXT NOT NULL,
                        language TEXT NOT NULL DEFAULT 'en',
                        created_at INTEGER NOT NULL,
                        updated_at INTEGER NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS template_versions (
                        id TEXT PRIMARY KEY,
                        template_id TEXT NOT NULL REFERENCES templates(id),
                        user_id TEXT NOT NULL REFERENCES users(id),
                        version INTEGER NOT NULL DEFAULT 1,
                        file_path TEXT NOT NULL,
                        file_hash TEXT NOT NULL,
                        fields_spec TEXT NOT NULL,
                        created_at INTEGER NOT NULL
                    );

                    CREATE UNIQUE INDEX IF NOT EXISTS unique_user_file_hash 
                    ON template_versions(user_id, file_hash);
                `)
                logger.info('Created database tables for serverless environment')
            } catch (error) {
                logger.error('Failed to create tables:', error)
                throw error
            }
            
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