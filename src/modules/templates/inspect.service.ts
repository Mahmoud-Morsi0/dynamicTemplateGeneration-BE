import { v4 as uuidv4 } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/drizzle'
import { templates, templateVersions, users } from '../../db/schema'
import { DocxParser } from './docx-parser'
import { saveTemplateFile, validateDocxFile } from '../../utils/file'
import { generateZodSchema } from '../../utils/zod'
import { logger } from '../../utils/logger'
import type { FieldSpec } from '../../utils/zod'

export interface InspectResult {
    templateId: string
    version: number
    fields: FieldSpec[]
    zodSchema: any
    isExisting: boolean
}

export class InspectService {
    public async inspectTemplate(
        buffer: Buffer,
        originalName: string,
        mimetype: string,
        userId: string
    ): Promise<InspectResult> {
        // Validate file
        if (!validateDocxFile(buffer, mimetype)) {
            throw new Error('Invalid DOCX file')
        }

        // Parse the document
        let parser: DocxParser
        let fields: FieldSpec[]

        try {
            parser = new DocxParser(buffer)
        } catch (error) {
            logger.error('Failed to create DocxParser:', error)
            throw new Error(error instanceof Error ? error.message : 'Failed to parse DOCX file')
        }

        try {
            const parseResult = parser.parse()
            fields = parseResult.fields
        } catch (error) {
            logger.error('Failed to parse document:', error)
            throw new Error(error instanceof Error ? error.message : 'Failed to extract fields from DOCX file')
        }

        // Generate Zod schema
        const zodSchema = generateZodSchema(fields)

        // Save file to storage
        const { filePath, fileHash } = await saveTemplateFile(buffer, originalName)

        // Check if this user already has a template with the same hash
        const existingVersion = await db
            .select()
            .from(templateVersions)
            .where(and(
                eq(templateVersions.fileHash, fileHash),
                eq(templateVersions.userId, userId)
            ))
            .limit(1)

        if (existingVersion.length > 0) {
            logger.info('User already has template with same hash, returning existing version', {
                userId,
                templateId: existingVersion[0]!.templateId
            })
            const existing = existingVersion[0]!
            return {
                templateId: existing.templateId,
                version: existing.version,
                fields: JSON.parse(existing.fieldsSpec) as FieldSpec[],
                zodSchema,
                isExisting: true
            }
        }

        // Create new template and version
        const templateId = uuidv4()
        const versionId = uuidv4()

        // Insert template
        await db.insert(templates).values({
            id: templateId,
            userId,
            name: originalName,
            language: 'en', // Default language
        })

        // Insert template version
        await db.insert(templateVersions).values({
            id: versionId,
            templateId,
            userId,
            version: 1,
            filePath,
            fileHash,
            fieldsSpec: JSON.stringify(fields),
        })

        logger.info('Template inspected and saved', { templateId, fileHash, userId })

        return {
            templateId,
            version: 1,
            fields,
            zodSchema,
            isExisting: false
        }
    }

    public async getTemplateVersion(
        templateId: string,
        userId: string,
        version?: number
    ): Promise<InspectResult | null> {
        const result = version
            ? await db
                .select()
                .from(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, userId),
                    eq(templateVersions.version, version)
                ))
            : await db
                .select()
                .from(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, userId)
                ))
                .orderBy(templateVersions.version)
                .limit(1)

        if (result.length === 0) {
            return null
        }

        const templateVersion = result[0]!
        const fields = JSON.parse(templateVersion.fieldsSpec) as FieldSpec[]
        const zodSchema = generateZodSchema(fields)

        return {
            templateId: templateVersion.templateId,
            version: templateVersion.version,
            fields,
            zodSchema,
            isExisting: true
        }
    }

    public async getTemplateByHash(
        fileHash: string,
        userId: string
    ): Promise<InspectResult | null> {
        const result = await db
            .select()
            .from(templateVersions)
            .where(and(
                eq(templateVersions.fileHash, fileHash),
                eq(templateVersions.userId, userId)
            ))
            .limit(1)

        if (result.length === 0) {
            return null
        }

        const templateVersion = result[0]!
        const fields = JSON.parse(templateVersion.fieldsSpec) as FieldSpec[]
        const zodSchema = generateZodSchema(fields)

        return {
            templateId: templateVersion.templateId,
            version: templateVersion.version,
            fields,
            zodSchema,
            isExisting: true
        }
    }

    public async getUserTemplates(userId: string): Promise<Array<{
        templateId: string
        name: string
        version: number
        createdAt: Date
        fields: FieldSpec[]
    }>> {
        const userTemplates = await db
            .select({
                templateId: templates.id,
                templateName: templates.name,
                version: templateVersions.version,
                createdAt: templateVersions.createdAt,
                fieldsSpec: templateVersions.fieldsSpec
            })
            .from(templates)
            .innerJoin(templateVersions, eq(templates.id, templateVersions.templateId))
            .where(eq(templates.userId, userId))
            .orderBy(templateVersions.createdAt)

        return userTemplates.map((template: any) => ({
            templateId: template.templateId,
            name: template.templateName,
            version: template.version,
            createdAt: template.createdAt,
            fields: JSON.parse(template.fieldsSpec) as FieldSpec[]
        }))
    }
}