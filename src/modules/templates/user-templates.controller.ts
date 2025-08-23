import { Request, Response } from 'express'
import { InspectService } from './inspect.service'
import { logger } from '../../utils/logger'

export class UserTemplatesController {
    private inspectService: InspectService

    constructor() {
        this.inspectService = new InspectService()
    }

    public async getUserTemplates(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' })
                return
            }

            const templates = await this.inspectService.getUserTemplates(req.user.userId)

            res.json({
                success: true,
                data: templates,
                count: templates.length
            })
        } catch (error) {
            logger.error('Error getting user templates:', error)
            res.status(500).json({
                error: 'Failed to get user templates',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}
