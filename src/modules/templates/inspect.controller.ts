import { Request, Response } from 'express'
import { InspectService } from './inspect.service'
import { logger } from '../../utils/logger'

export class InspectController {
    private inspectService: InspectService

    constructor() {
        this.inspectService = new InspectService()
    }

    public async inspectTemplate(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' })
                return
            }

            const { buffer, originalname, mimetype } = req.file

            logger.info('Inspecting template', {
                filename: originalname,
                size: buffer.length,
                mimetype
            })

            const result = await this.inspectService.inspectTemplate(
                buffer,
                originalname,
                mimetype
            )

            res.json({
                success: true,
                data: {
                    templateId: result.templateId,
                    version: result.version,
                    fields: result.fields,
                },
            })
        } catch (error) {
            logger.error('Error inspecting template:', error)
            res.status(500).json({
                error: 'Failed to inspect template',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    public async getTemplateSpec(req: Request, res: Response): Promise<void> {
        try {
            const { templateId } = req.params
            const { version } = req.query

            const result = await this.inspectService.getTemplateVersion(
                templateId,
                version ? parseInt(version as string, 10) : undefined
            )

            if (!result) {
                res.status(404).json({ error: 'Template not found' })
                return
            }

            res.json({
                success: true,
                data: {
                    templateId: result.templateId,
                    version: result.version,
                    fields: result.fields,
                },
            })
        } catch (error) {
            logger.error('Error getting template spec:', error)
            res.status(500).json({
                error: 'Failed to get template specification',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }
}
