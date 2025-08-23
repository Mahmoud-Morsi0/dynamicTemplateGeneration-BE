import { Router } from 'express'
import { InspectController } from './inspect.controller'
import { RenderController } from './render.controller'
import { UserTemplatesController } from './user-templates.controller'
import { upload } from '../../middleware/upload'
import { authenticateToken } from '../../middleware/auth'

const router = Router()
const inspectController = new InspectController()
const renderController = new RenderController()
const userTemplatesController = new UserTemplatesController()

// All template routes require authentication
router.use(authenticateToken)

// Template inspection endpoints
router.post('/inspect', upload.single('template'), inspectController.inspectTemplate.bind(inspectController))
router.get('/:templateId/spec', inspectController.getTemplateSpec.bind(inspectController))

// Template rendering endpoints
router.post('/render', renderController.renderDocx.bind(renderController))
router.post('/render/docx', renderController.renderDocx.bind(renderController))
router.post('/:templateId/render/pdf', renderController.renderPdf.bind(renderController))

// User templates endpoints
router.get('/', userTemplatesController.getUserTemplates.bind(userTemplatesController))

export default router
