import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { templates, templateVersions } from './schema'

const sqlite = new Database('./storage/app.db')
const db = drizzle(sqlite)

// Create tables manually
async function initDatabase() {
    try {
        // Create templates table
        await db.run(`
            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                updated_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
        `)

        // Create template_versions table
        await db.run(`
            CREATE TABLE IF NOT EXISTS template_versions (
                id TEXT PRIMARY KEY,
                template_id TEXT REFERENCES templates(id),
                version INTEGER NOT NULL DEFAULT 1,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL UNIQUE,
                fields_spec TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
        `)

        console.log('Database tables created successfully!')
    } catch (error) {
        console.error('Error creating database tables:', error)
    } finally {
        sqlite.close()
    }
}

initDatabase()
