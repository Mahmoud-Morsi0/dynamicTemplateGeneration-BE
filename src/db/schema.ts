import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const templates = sqliteTable('templates', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id).notNull(),
    name: text('name').notNull(),
    language: text('language').notNull().default('en'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const templateVersions = sqliteTable('template_versions', {
    id: text('id').primaryKey(),
    templateId: text('template_id').references(() => templates.id).notNull(),
    userId: text('user_id').references(() => users.id).notNull(),
    version: integer('version').notNull().default(1),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash').notNull(),
    fieldsSpec: text('fields_spec').notNull(),
    fileBuffer: text('file_buffer'), // Store base64 encoded buffer for serverless
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    // Unique constraint: one user can only have one template with the same hash
    uniqueUserFileHash: uniqueIndex('unique_user_file_hash').on(table.userId, table.fileHash)
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateVersion = typeof templateVersions.$inferSelect
export type NewTemplateVersion = typeof templateVersions.$inferInsert
