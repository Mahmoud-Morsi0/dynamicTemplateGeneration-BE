import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { env } from '../config/env'

const sqlite = new Database(env.DB_URL.replace('file:', ''))
export const db = drizzle(sqlite)
