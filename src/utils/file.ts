import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../config/env'

export const generateFileHash = (buffer: Buffer): string => {
    return createHash('sha256').update(buffer).digest('hex')
}

export const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
}

export const saveTemplateFile = async (buffer: Buffer, originalName: string): Promise<{ filePath: string; fileHash: string }> => {
    const fileHash = generateFileHash(buffer)
    const sanitizedName = sanitizeFilename(originalName)
    const extension = path.extname(sanitizedName)
    const fileName = `${uuidv4()}${extension}`
    const filePath = path.join(env.STORAGE_DIR, 'templates', fileName)

    // Ensure storage directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    // Save file
    await fs.writeFile(filePath, buffer)

    return { filePath, fileHash }
}

export const validateDocxFile = (buffer: Buffer, mimetype: string): boolean => {
    // Check MIME type
    if (!mimetype.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        return false
    }

    // Check file size
    const maxSize = env.MAX_UPLOAD_MB * 1024 * 1024
    if (buffer.length > maxSize) {
        return false
    }

    // Check magic bytes for DOCX
    const docxMagicBytes = [0x50, 0x4B, 0x03, 0x04]
    const fileMagicBytes = Array.from(buffer.slice(0, 4))

    return docxMagicBytes.every((byte, index) => byte === fileMagicBytes[index])
}
