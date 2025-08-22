import { v4 as uuidv4 } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/drizzle'
import { templates, templateVersions } from '../../db/schema'
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
}

export class InspectService {
    public async inspectTemplate(
        buffer: Buffer,
        originalName: string,
        mimetype: string
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

        // Check if template with same hash already exists
        const existingVersion = await db
            .select()
            .from(templateVersions)
            .where(eq(templateVersions.fileHash, fileHash))
            .limit(1)

        if (existingVersion.length > 0) {
            logger.info('Template with same hash already exists, returning existing version')
            const existing = existingVersion[0]!
            return {
                templateId: existing.templateId || '',
                version: existing.version,
                fields: JSON.parse(existing.fieldsSpec as string) as FieldSpec[],
                zodSchema,
            }
        }

        // Create new template and version
        const templateId = uuidv4()
        const versionId = uuidv4()

        // Insert template
        await db.insert(templates).values({
            id: templateId,
            name: originalName,
            language: 'en', // Default language
        })

        // Insert template version
        await db.insert(templateVersions).values({
            id: versionId,
            templateId,
            version: 1,
            filePath,
            fileHash,
            fieldsSpec: JSON.stringify(fields),
        })

        logger.info('Template inspected and saved', { templateId, fileHash })

        return {
            templateId,
            version: 1,
            fields,
            zodSchema,
        }
    }

    public async getTemplateVersion(templateId: string, version?: number): Promise<InspectResult | null> {
        const result = version
            ? await db
                .select()
                .from(templateVersions)
                .where(and(eq(templateVersions.templateId, templateId), eq(templateVersions.version, version)))
            : await db
                .select()
                .from(templateVersions)
                .where(eq(templateVersions.templateId, templateId))
                .orderBy(templateVersions.version)
                .limit(1)

        if (result.length === 0) {
            return null
        }

        const templateVersion = result[0]!
        const fields = JSON.parse(templateVersion.fieldsSpec as string) as FieldSpec[]
        const zodSchema = generateZodSchema(fields)

        return {
            templateId: templateVersion.templateId || '',
            version: templateVersion.version,
            fields,
            zodSchema,
        }
    }

    public async getTemplateByHash(fileHash: string): Promise<InspectResult | null> {
        const result = await db
            .select()
            .from(templateVersions)
            .where(eq(templateVersions.fileHash, fileHash))
            .limit(1)

        if (result.length === 0) {
            return null
        }

        const templateVersion = result[0]!
        const fields = JSON.parse(templateVersion.fieldsSpec as string) as FieldSpec[]
        const zodSchema = generateZodSchema(fields)

        return {
            templateId: templateVersion.templateId || '',
            version: templateVersion.version,
            fields,
            zodSchema,
        }
    }
}
