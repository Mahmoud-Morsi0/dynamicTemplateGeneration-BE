import { Request, Response } from 'express'
import { InspectService } from './inspect.service'
import { logger } from '../../utils/logger'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/drizzle'
import { templates, templateVersions } from '../../db/schema'
import fs from 'fs'
import path from 'path'

export class DeleteController {
    private inspectService: InspectService

    constructor() {
        this.inspectService = new InspectService()
    }

    public async deleteTemplate(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' })
                return
            }

            const { templateId } = req.params as { templateId: string }

            logger.info('Deleting template', {
                templateId,
                userId: req.user.userId
            })

            // First, get all template versions to delete their files
            const templateVersionsToDelete = await db
                .select()
                .from(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, req.user.userId)
                ))

            if (templateVersionsToDelete.length === 0) {
                res.status(404).json({ error: 'Template not found or access denied' })
                return
            }

            // Delete physical files
            for (const version of templateVersionsToDelete) {
                try {
                    if (fs.existsSync(version.filePath)) {
                        fs.unlinkSync(version.filePath)
                        logger.info('Deleted template file', { filePath: version.filePath })
                    }
                } catch (fileError) {
                    logger.warn('Failed to delete template file', {
                        filePath: version.filePath,
                        error: fileError instanceof Error ? fileError.message : 'Unknown error'
                    })
                    // Continue with database deletion even if file deletion fails
                }
            }

            // Delete from database (cascade will handle related records)
            const deleteResult = await db
                .delete(templates)
                .where(and(
                    eq(templates.id, templateId),
                    eq(templates.userId, req.user.userId)
                ))

            logger.info('Template deleted successfully', {
                templateId,
                userId: req.user.userId,
                versionsDeleted: templateVersionsToDelete.length
            })

            res.json({
                success: true,
                message: 'Template deleted successfully',
                data: {
                    templateId,
                    versionsDeleted: templateVersionsToDelete.length
                }
            })

        } catch (error) {
            logger.error('Error deleting template:', error)
            res.status(500).json({
                error: 'Failed to delete template',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    public async deleteTemplateVersion(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' })
                return
            }

            const { templateId, version } = req.params as { templateId: string; version: string }
            const versionNumber = parseInt(version, 10)

            if (isNaN(versionNumber)) {
                res.status(400).json({ error: 'Invalid version number' })
                return
            }

            logger.info('Deleting template version', {
                templateId,
                version: versionNumber,
                userId: req.user.userId
            })

            // Get the specific version to delete
            const templateVersion = await db
                .select()
                .from(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, req.user.userId),
                    eq(templateVersions.version, versionNumber)
                ))
                .limit(1)

            if (templateVersion.length === 0) {
                res.status(404).json({ error: 'Template version not found or access denied' })
                return
            }

            const versionToDelete = templateVersion[0]!

            // Delete physical file
            try {
                if (fs.existsSync(versionToDelete.filePath)) {
                    fs.unlinkSync(versionToDelete.filePath)
                    logger.info('Deleted template version file', { filePath: versionToDelete.filePath })
                }
            } catch (fileError) {
                logger.warn('Failed to delete template version file', {
                    filePath: versionToDelete.filePath,
                    error: fileError instanceof Error ? fileError.message : 'Unknown error'
                })
            }

            // Delete from database
            await db
                .delete(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, req.user.userId),
                    eq(templateVersions.version, versionNumber)
                ))

            // Check if this was the last version of the template
            const remainingVersions = await db
                .select()
                .from(templateVersions)
                .where(and(
                    eq(templateVersions.templateId, templateId),
                    eq(templateVersions.userId, req.user.userId)
                ))

            // If no versions left, delete the template itself
            if (remainingVersions.length === 0) {
                await db
                    .delete(templates)
                    .where(and(
                        eq(templates.id, templateId),
                        eq(templates.userId, req.user.userId)
                    ))

                logger.info('Template deleted (no versions remaining)', { templateId })
            }

            logger.info('Template version deleted successfully', {
                templateId,
                version: versionNumber,
                userId: req.user.userId
            })

            res.json({
                success: true,
                message: 'Template version deleted successfully',
                data: {
                    templateId,
                    version: versionNumber,
                    templateDeleted: remainingVersions.length === 0
                }
            })

        } catch (error) {
            logger.error('Error deleting template version:', error)
            res.status(500).json({
                error: 'Failed to delete template version',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}
