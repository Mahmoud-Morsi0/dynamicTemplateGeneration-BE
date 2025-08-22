import multer from 'multer'
import { env } from '../config/env'

const storage = multer.memoryStorage()

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(new Error('Only DOCX files are allowed'))
        return
    }

    // Check file size
    const maxSize = env.MAX_UPLOAD_MB * 1024 * 1024
    if (file.size > maxSize) {
        cb(new Error(`File size must be less than ${env.MAX_UPLOAD_MB}MB`))
        return
    }

    cb(null, true)
}

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    },
})
