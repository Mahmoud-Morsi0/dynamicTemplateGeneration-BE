import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'

let dbInstance: any = null

function initializeDatabase() {
    if (dbInstance) return dbInstance

    try {
        // Check if Turso credentials are available
        if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) {
            logger.info('Initializing Turso cloud database connection')
            
            // Create Turso client
            const tursoClient = createClient({
                url: env.TURSO_DATABASE_URL,
                authToken: env.TURSO_AUTH_TOKEN,
            })
            
            dbInstance = drizzleLibsql(tursoClient, { schema })
            
            // Create tables in Turso database
            createTursoTables(tursoClient)
            
            logger.info('✅ Turso cloud database initialized successfully')
            logger.info('🎉 Data will persist permanently!')
            return dbInstance
        }

        // Check if we're in a serverless environment without Turso
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

        if (isServerless) {
            logger.warn('⚠️ Running in serverless environment without cloud database')
            logger.warn('⚠️ Using in-memory database - data will not persist')
            logger.warn('💡 Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for persistent storage')
            
            // Create in-memory database for serverless
            const sqlite = new Database(':memory:')
            dbInstance = drizzle(sqlite, { schema })
            
            // Create tables automatically in serverless environment
            createInMemoryTables(sqlite)
            
            logger.info('Initialized in-memory SQLite database (data will not persist)')
            return dbInstance
        }

        // Local development setup
        logger.info('Initializing local SQLite database for development')
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

async function createTursoTables(client: any) {
    try {
        logger.info('Creating tables in Turso database...')
        
        await client.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `)

        await client.execute(`
            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `)

        await client.execute(`
            CREATE TABLE IF NOT EXISTS template_versions (
                id TEXT PRIMARY KEY,
                template_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                fields_spec TEXT NOT NULL,
                file_buffer TEXT,
                created_at INTEGER NOT NULL
            );
        `)

        await client.execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS unique_user_file_hash 
            ON template_versions(user_id, file_hash);
        `)

        logger.info('✅ Turso database tables created successfully')
    } catch (error) {
        logger.error('Failed to create Turso tables:', error)
        throw error
    }
}

function createInMemoryTables(sqlite: any) {
    try {
        // Disable foreign key constraints for in-memory database
        sqlite.pragma('foreign_keys = OFF')
        
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
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS template_versions (
                id TEXT PRIMARY KEY,
                template_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                fields_spec TEXT NOT NULL,
                file_buffer TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS unique_user_file_hash 
            ON template_versions(user_id, file_hash);
        `)
        
        logger.info('In-memory database tables created')
    } catch (error) {
        logger.error('Failed to create in-memory tables:', error)
        throw error
    }
}

export { initializeDatabase }
export const db = initializeDatabase()

export default db