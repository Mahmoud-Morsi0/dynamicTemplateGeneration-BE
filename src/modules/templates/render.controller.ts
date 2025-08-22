import { Request, Response } from 'express'
import { RenderService, RenderRequest } from './render.service'
import { logger } from '../../utils/logger'

export class RenderController {
    private renderService: RenderService

    constructor() {
        this.renderService = new RenderService()
    }

    public async renderDocx(req: Request, res: Response): Promise<void> {
        try {
            const { templateId, fileHash, data } = req.body

            if (!data) {
                res.status(400).json({ error: 'Data is required' })
                return
            }

            if (!templateId && !fileHash) {
                res.status(400).json({ error: 'Either templateId or fileHash is required' })
                return
            }

            const renderRequest: RenderRequest = {
                templateId,
                fileHash,
                data,
            }

            logger.info('Rendering document', {
                templateId,
                fileHash,
                dataKeys: Object.keys(data)
            })

            const renderedBuffer = await this.renderService.renderDocument(renderRequest)

            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            res.setHeader('Content-Disposition', 'attachment; filename="rendered-document.docx"')
            res.setHeader('Content-Length', renderedBuffer.length.toString())

            res.send(renderedBuffer)
        } catch (error) {
            logger.error('Error rendering document:', error)
            res.status(500).json({
                error: 'Failed to render document',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    // Stub for future PDF rendering
    public async renderPdf(req: Request, res: Response): Promise<void> {
        res.status(501).json({
            error: 'Not Implemented',
            message: 'PDF rendering will be implemented in Phase 3 with LibreOffice worker',
        })
    }
}
