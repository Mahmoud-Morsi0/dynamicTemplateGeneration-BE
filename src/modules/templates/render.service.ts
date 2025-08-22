import { eq, and } from 'drizzle-orm'
import { db } from '../../db/drizzle'
import { templateVersions } from '../../db/schema'
import { DocxRenderer } from './docx-renderer'
import { InspectService } from './inspect.service'
import { logger } from '../../utils/logger'
import { z } from 'zod'

export interface RenderRequest {
    templateId?: string
    fileHash?: string
    data: Record<string, any>
}

export class RenderService {
    private inspectService: InspectService

    constructor() {
        this.inspectService = new InspectService()
    }

    public async renderDocument(request: RenderRequest): Promise<Buffer> {
        // Get template specification
        let templateSpec
        if (request.templateId) {
            templateSpec = await this.inspectService.getTemplateVersion(request.templateId)
        } else if (request.fileHash) {
            templateSpec = await this.inspectService.getTemplateByHash(request.fileHash)
        } else {
            throw new Error('Either templateId or fileHash must be provided')
        }

        if (!templateSpec) {
            throw new Error('Template not found')
        }

        // Validate data against schema
        try {
            templateSpec.zodSchema.parse(request.data)
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(err =>
                    `${err.path.join('.')}: ${err.message}`
                ).join(', ')
                throw new Error(`Validation failed: ${validationErrors}`)
            }
            throw error
        }

        // Get template file path
        const templateVersion = await db
            .select()
            .from(templateVersions)
            .where(and(
                eq(templateVersions.templateId, templateSpec.templateId),
                eq(templateVersions.version, templateSpec.version)
            ))
            .limit(1)

        if (templateVersion.length === 0) {
            throw new Error('Template file not found')
        }

        // Render the document
        const renderer = await DocxRenderer.fromFile(templateVersion[0].filePath)
        const renderedBuffer = renderer.render(request.data)

        logger.info('Document rendered successfully', {
            templateId: templateSpec.templateId,
            version: templateSpec.version
        })

        return renderedBuffer
    }
}
