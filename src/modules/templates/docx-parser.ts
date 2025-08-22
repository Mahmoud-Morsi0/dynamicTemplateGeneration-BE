import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { FieldSpec } from '../../utils/zod'

interface ParsedPlaceholder {
    key: string
    type: string
    label?: string
    required?: boolean
    maxLength?: number
    min?: number
    max?: number
    step?: number
    options?: string[]
    default?: string
    width?: number
    height?: number
    format?: 'email'
}

interface ParsedLoop {
    key: string
    itemShape: Record<string, FieldSpec>
}

export class DocxParser {
    private zip: PizZip
    private doc: Docxtemplater

    constructor(buffer: Buffer) {
        try {
            if (!buffer || buffer.length === 0) {
                throw new Error('Empty or invalid buffer provided')
            }

            this.zip = new PizZip(buffer)

            // Initialize Docxtemplater with minimal configuration to avoid tag conflicts
            this.doc = new Docxtemplater(this.zip, {
                delimiters: {
                    start: '___PLACEHOLDER_START___',
                    end: '___PLACEHOLDER_END___'
                }
            })
        } catch (error) {
            if (error instanceof Error) {
                // Handle specific docxtemplater errors
                if (error.message.includes('Multi error') || error.message.includes('duplicate')) {
                    throw new Error('Document contains conflicting placeholder formats. Please use either {variable} or {{variable}} consistently.')
                }
                if (error.message.includes('zip')) {
                    throw new Error('File is not a valid DOCX format')
                }
                throw new Error(`DOCX parsing error: ${error.message}`)
            }
            throw new Error('Unknown error occurred while parsing DOCX file')
        }
    }

    private parsePlaceholder(text: string): ParsedPlaceholder | null {
        // Match both {{ variable | key=value }} and {variable} formats
        const doubleRegex = /\{\{\s*([^|}]+)(?:\s*\|\s*([^}]+))?\s*\}\}/
        const singleRegex = /\{([^{}|]+)\}/

        let match = doubleRegex.exec(text)
        let modifiers = ''

        if (!match) {
            match = singleRegex.exec(text)
            if (!match) return null
        } else {
            modifiers = match[2] || ''
        }

        let key = match[1]?.trim() || match[3]?.trim() || ''

        // Clean up the key - remove extra spaces and normalize
        key = key.replace(/\s+/g, ' ').trim()

        // If key is empty, skip this placeholder
        if (!key) return null

        const result: ParsedPlaceholder = { key, type: 'text' }

        // Parse modifiers
        const modifierRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
        let modifierMatch

        while ((modifierMatch = modifierRegex.exec(modifiers)) !== null) {
            const [, modifierKey, quotedValue, singleQuotedValue, unquotedValue] = modifierMatch
            const value = quotedValue || singleQuotedValue || unquotedValue

            switch (modifierKey) {
                case 'type':
                    if (value) result.type = value
                    break
                case 'label':
                    if (value) result.label = value
                    break
                case 'required':
                    result.required = value === 'true' || value === ''
                    break
                case 'maxLength':
                    if (value) result.maxLength = parseInt(value, 10)
                    break
                case 'min':
                    if (value) result.min = parseFloat(value)
                    break
                case 'max':
                    if (value) result.max = parseFloat(value)
                    break
                case 'step':
                    if (value) result.step = parseFloat(value)
                    break
                case 'options':
                    if (value) result.options = value.split(',').map(opt => opt.trim())
                    break
                case 'default':
                    if (value) result.default = value
                    break
                case 'width':
                    if (value) result.width = parseInt(value, 10)
                    break
                case 'height':
                    if (value) result.height = parseInt(value, 10)
                    break
            }
        }

        // Infer type if not specified
        if (result.type === 'text') {
            result.type = this.inferFieldType(key, result)
        }

        return result
    }

    private inferFieldType(key: string, placeholder: ParsedPlaceholder): FieldSpec['type'] {
        const keyLower = key.toLowerCase()

        // Check for common patterns
        if (keyLower.includes('email') || keyLower.includes('mail')) {
            placeholder.format = 'email'
            return 'text'
        }
        if (keyLower.includes('date') || keyLower.includes('birth') || keyLower.includes('hire') ||
            keyLower.includes('created') || keyLower.includes('updated') || keyLower.includes('contract date')) {
            return 'date'
        }
        if (keyLower.includes('salary') || keyLower.includes('amount') || keyLower.includes('price') ||
            keyLower.includes('number') || keyLower.includes('count') || keyLower.includes('cost') ||
            keyLower.includes('fee') || keyLower.includes('total')) {
            return 'number'
        }
        if (keyLower.includes('logo') || keyLower.includes('image') || keyLower.includes('photo') ||
            keyLower.includes('picture') || keyLower.includes('avatar')) {
            return 'image'
        }
        if (keyLower.includes('description') || keyLower.includes('comment') || keyLower.includes('note') ||
            keyLower.includes('remarks') || keyLower.includes('details')) {
            placeholder.maxLength = 500
            return 'text'
        }

        return 'text'
    }

    private parseLoops(content: string): ParsedLoop[] {
        const loops: ParsedLoop[] = []
        const loopRegex = /\{#\s*(\w+)\s*\}(.*?)\{\/\s*\1\s*\}/gs

        let match
        while ((match = loopRegex.exec(content)) !== null) {
            const [, loopKey, loopContent] = match
            if (!loopKey || !loopContent) continue

            const itemShape: Record<string, FieldSpec> = {}

            // Parse placeholders within the loop - both {{ variable }} and {variable} formats
            const placeholderRegex = /(?:\{\{\s*([^|}]+)(?:\s*\|\s*([^}]+))?\s*\}\}|\{([^{}|]+)\})/g
            let placeholderMatch

            while ((placeholderMatch = placeholderRegex.exec(loopContent)) !== null) {
                const parsed = this.parsePlaceholder(placeholderMatch[0])
                if (parsed) {
                    itemShape[parsed.key] = this.convertToFieldSpec(parsed)
                }
            }

            if (Object.keys(itemShape).length > 0) {
                loops.push({ key: loopKey, itemShape })
            }
        }

        return loops
    }

    private convertToFieldSpec(parsed: ParsedPlaceholder): FieldSpec {
        const fieldSpec: FieldSpec = {
            key: parsed.key,
            type: parsed.type as FieldSpec['type'],
            ...(parsed.label && { label: { en: parsed.label, ar: parsed.label } }),
            ...(parsed.required !== undefined && { required: parsed.required }),
            ...(parsed.maxLength !== undefined && { maxLength: parsed.maxLength }),
            ...(parsed.min !== undefined && { min: parsed.min }),
            ...(parsed.max !== undefined && { max: parsed.max }),
            ...(parsed.step !== undefined && { step: parsed.step }),
            ...(parsed.options && { options: parsed.options }),
            ...(parsed.default && { default: parsed.default }),
            ...(parsed.format && { format: parsed.format }),
        }

        if (parsed.type === 'image' && (parsed.width || parsed.height)) {
            fieldSpec.constraints = {
                ...(parsed.width && { width: parsed.width }),
                ...(parsed.height && { height: parsed.height }),
            }
        }

        return fieldSpec
    }

    public parse(): { fields: FieldSpec[]; loops: ParsedLoop[] } {
        try {
            let content: string
            try {
                // Extract raw text from the zip file to avoid Docxtemplater parsing conflicts
                const documentXml = this.zip.files['word/document.xml']
                if (!documentXml) {
                    throw new Error('Invalid DOCX structure - missing document.xml')
                }

                const xmlContent = documentXml.asText()
                // Simple text extraction from XML (removing tags)
                content = xmlContent
                    .replace(/<[^>]*>/g, ' ')  // Remove XML tags
                    .replace(/\s+/g, ' ')      // Normalize whitespace
                    .trim()

                // Fallback to getFullText if direct extraction fails
                if (!content) {
                    content = this.doc.getFullText()
                }
            } catch (error) {
                // Fallback to Docxtemplater's getFullText method
                try {
                    content = this.doc.getFullText()
                } catch (fallbackError) {
                    throw new Error('Failed to extract text from DOCX file - file may be corrupted or password protected')
                }
            }

            if (!content || content.trim().length === 0) {
                return { fields: [], loops: [] }
            }

            const fields: FieldSpec[] = []
            const loops: ParsedLoop[] = []
            const seenKeys = new Set<string>()

            try {
                // Parse regular placeholders - handle both formats but prioritize complete matches
                const placeholders = new Set<string>()

                // First pass: find all double brace placeholders
                const doubleRegex = /\{\{\s*([^}]+?)\s*\}\}/g
                let match
                while ((match = doubleRegex.exec(content)) !== null) {
                    placeholders.add(match[0])
                }

                // Second pass: find single brace placeholders that don't conflict with double braces
                const singleRegex = /\{([^{}]+?)\}/g
                const singleContent = content.replace(/\{\{[^}]+?\}\}/g, '___DOUBLE_BRACE___')
                while ((match = singleRegex.exec(singleContent)) !== null) {
                    placeholders.add(match[0])
                }

                // Parse all found placeholders
                for (const placeholder of placeholders) {
                    try {
                        const parsed = this.parsePlaceholder(placeholder)
                        if (parsed && parsed.key && !seenKeys.has(parsed.key)) {
                            seenKeys.add(parsed.key)
                            fields.push(this.convertToFieldSpec(parsed))
                        }
                    } catch (parseError) {
                        // Continue parsing other placeholders if one fails
                        console.warn('Failed to parse placeholder:', placeholder, parseError)
                    }
                }

                // Parse loops
                try {
                    const parsedLoops = this.parseLoops(content)
                    for (const loop of parsedLoops) {
                        if (loop.key && !seenKeys.has(loop.key)) {
                            seenKeys.add(loop.key)
                            fields.push({
                                key: loop.key,
                                type: 'array',
                                itemShape: loop.itemShape,
                            })
                        }
                    }
                } catch (loopError) {
                    console.warn('Failed to parse loops:', loopError)
                }

            } catch (regexError) {
                throw new Error('Failed to parse placeholders - invalid regex pattern or document structure')
            }

            return { fields, loops }
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Unknown error occurred while parsing document content')
        }
    }
}
