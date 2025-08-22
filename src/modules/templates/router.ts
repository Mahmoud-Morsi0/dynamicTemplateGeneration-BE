import { Router } from 'express'
import { InspectController } from './inspect.controller'
import { RenderController } from './render.controller'
import { upload } from '../../middleware/upload'

const router = Router()
const inspectController = new InspectController()
const renderController = new RenderController()

// Template inspection endpoints
router.post('/inspect', upload.single('file'), inspectController.inspectTemplate.bind(inspectController))
router.get('/:templateId/spec', inspectController.getTemplateSpec.bind(inspectController))

// Template rendering endpoints
router.post('/render/docx', renderController.renderDocx.bind(renderController))
router.post('/:templateId/render/pdf', renderController.renderPdf.bind(renderController))

// Stub endpoints for future phases
router.get('/', (req, res) => {
    res.status(501).json({
        error: 'Not Implemented',
        message: 'Template listing will be implemented in Phase 2',
    })
})

router.post('/', (req, res) => {
    res.status(501).json({
        error: 'Not Implemented',
        message: 'Template creation will be implemented in Phase 2',
    })
})

router.get('/:templateId', (req, res) => {
    res.status(501).json({
        error: 'Not Implemented',
        message: 'Template details will be implemented in Phase 2',
    })
})

export default router
