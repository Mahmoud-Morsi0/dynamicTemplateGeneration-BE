import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const templates = sqliteTable('templates', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    language: text('language').notNull().default('en'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const templateVersions = sqliteTable('template_versions', {
    id: text('id').primaryKey(),
    templateId: text('template_id').references(() => templates.id),
    version: integer('version').notNull().default(1),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash').notNull().unique(),
    fieldsSpec: text('fields_spec').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateVersion = typeof templateVersions.$inferSelect
export type NewTemplateVersion = typeof templateVersions.$inferInsert
