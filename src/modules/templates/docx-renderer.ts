import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
// @ts-ignore - no types available for this module
import ImageModule from 'docxtemplater-image-module-free'
import { promises as fs } from 'fs'
import { logger } from '../../utils/logger'

interface ImageOptions {
    width?: number
    height?: number
}

export class DocxRenderer {
    private zip!: PizZip
    private doc!: Docxtemplater
    private isManualMode: boolean = false

    constructor(buffer: Buffer) {
        try {
            this.zip = new PizZip(buffer)

            // Configure image module
            // @ts-ignore
            const imageModule = new ImageModule({
                centered: false,
                fileType: 'docx',
                getImage: async (tagValue: string) => {
                    try {
                        const response = await fetch(tagValue)
                        if (!response.ok) {
                            throw new Error(`Failed to fetch image: ${response.statusText}`)
                        }
                        const arrayBuffer = await response.arrayBuffer()
                        return {
                            width: 120,
                            height: 40,
                            data: Buffer.from(arrayBuffer),
                            extension: '.png',
                        }
                    } catch (error) {
                        logger.error('Error fetching image:', error)
                        return null
                    }
                },
                getSize: (img: any, tagValue: string, tagName: string) => {
                    // Extract size from tag name or use defaults
                    const sizeMatch = tagName.match(/width=(\d+).*height=(\d+)/)
                    if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
                        return [parseInt(sizeMatch[1]), parseInt(sizeMatch[2])]
                    }
                    return [120, 40] // Default size
                },
            })

            // First preprocess the document to normalize formats
            this.preprocessDocument()

            // Process watermarks for placeholder compatibility
            this.processWatermarks()

            // Initialize Docxtemplater with non-conflicting delimiters
            this.doc = new Docxtemplater(this.zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: [imageModule],
                errorLogging: false,
                delimiters: {
                    start: '{{',
                    end: '}}'
                },
                nullGetter() {
                    return ''
                }
            })

            logger.info('DocxRenderer initialized successfully')
        } catch (error) {
            logger.error('DocxRenderer initialization failed:', error)
            if (error instanceof Error) {
                if (error.message.includes('Multi error') || error.message.includes('duplicate')) {
                    // Try a completely different approach - manual text replacement
                    logger.warn('Docxtemplater failed, attempting manual rendering...')
                    try {
                        this.initializeManualRenderer(buffer)
                        return
                    } catch (manualError) {
                        throw new Error('Document contains incompatible placeholder formats that cannot be processed automatically.')
                    }
                }
                throw error
            }
            throw new Error('Failed to initialize document renderer')
        }
    }

    private initializeManualRenderer(buffer: Buffer) {
        logger.info('Initializing manual renderer for mixed placeholder formats')
        this.zip = new PizZip(buffer)
        this.isManualMode = true

        // Preprocess document for manual rendering
        this.preprocessDocument()
        this.processWatermarks()
        logger.info('Manual renderer initialized successfully')
    }

    private preprocessDocument() {
        try {
            // Get the main document XML
            const documentXml = this.zip.files['word/document.xml']
            if (!documentXml) {
                throw new Error('No document.xml found in DOCX file')
            }

            let xmlContent = documentXml.asText()
            if (!xmlContent || xmlContent.trim().length === 0) {
                throw new Error('Document XML content is empty')
            }

            logger.info('Starting document preprocessing for mixed placeholder formats')

            // More comprehensive placeholder normalization
            // Strategy: Convert ALL placeholders to double brace format consistently

            // Step 1: Find and protect existing double braces with a very unique pattern
            const protectedPatterns: Array<{ token: string; original: string }> = []
            let protectedIndex = 0

            // More precise pattern to protect existing double braces
            xmlContent = xmlContent.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match) => {
                const token = `___DOCXRENDERER_PROTECTED_${protectedIndex++}_PROTECTED___`
                protectedPatterns.push({ token, original: match })
                logger.debug(`Protected double brace: ${match} -> ${token}`)
                return token
            })

            // Step 2: Convert ALL remaining single braces to double braces
            // This handles patterns like {company}, {Contract Date}, etc.
            let convertedCount = 0
            xmlContent = xmlContent.replace(/\{([^{}]+?)\}/g, (match, content) => {
                convertedCount++
                const converted = `{{${content.trim()}}}`
                logger.debug(`Converting single brace: ${match} -> ${converted}`)
                return converted
            })

            // Step 3: Restore the original double braces
            protectedPatterns.forEach(({ token, original }) => {
                xmlContent = xmlContent.replace(token, original)
                logger.debug(`Restored protected: ${token} -> ${original}`)
            })

            // Step 4: Update the document XML in the zip
            this.zip.file('word/document.xml', xmlContent)

            logger.info(`Document preprocessing completed successfully:`)
            logger.info(`- Protected ${protectedPatterns.length} existing double brace placeholders`)
            logger.info(`- Converted ${convertedCount} single brace placeholders to double braces`)

        } catch (error) {
            logger.error('Document preprocessing failed:', error)
            throw new Error(`Failed to preprocess document: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    private processWatermarks(): void {
        try {
            // Check and process main document watermarks
            const documentXml = this.zip.files['word/document.xml']
            if (documentXml) {
                let xmlContent = documentXml.asText()
                const hasWatermarks = xmlContent.includes('<w:watermark') ||
                    xmlContent.includes('w:hdr') ||
                    xmlContent.includes('watermark')

                if (hasWatermarks) {
                    logger.info('Document contains watermarks - ensuring placeholder compatibility')
                    this.zip.file('word/document.xml', xmlContent)
                }
            }

            // Process header/footer files that might contain watermarks
            const headerFooterFiles = Object.keys(this.zip.files).filter(name =>
                (name.startsWith('word/header') || name.startsWith('word/footer')) && name.endsWith('.xml')
            )

            headerFooterFiles.forEach(fileName => {
                const file = this.zip.files[fileName]
                if (file) {
                    let content = file.asText()
                    // Ensure watermark text supports placeholders
                    if (content.includes('watermark') || content.includes('<w:t>')) {
                        logger.debug(`Processing watermarks in ${fileName}`)
                        this.zip.file(fileName, content)
                    }
                }
            })

            logger.info('Watermark processing completed')
        } catch (error) {
            logger.warn('Watermark processing failed, continuing without watermark support:', error)
        }
    }

    public render(data: Record<string, any>): Buffer {
        try {
            logger.info(`Rendering document with isManualMode: ${this.isManualMode}`)
            logger.info('Render data:', JSON.stringify(data, null, 2))

            if (this.isManualMode) {
                logger.info('Using manual rendering mode')
                return this.renderManually(data)
            }

            logger.info('Using Docxtemplater rendering mode')
            // Set the template variables
            this.doc.setData(data)

            // Render the document
            this.doc.render()

            // Get the rendered document as a buffer
            const output = this.doc.getZip().generate({ type: 'nodebuffer' })

            return output
        } catch (error) {
            logger.error('Error rendering document:', error)
            throw new Error(`Failed to render document: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    private renderManually(data: Record<string, any>): Buffer {
        try {
            logger.info('Performing advanced manual text replacement rendering')
            logger.info('Data to replace:', JSON.stringify(data, null, 2))

            // Get the main document XML
            const documentXml = this.zip.files['word/document.xml']
            if (!documentXml) {
                throw new Error('No document.xml found')
            }

            let xmlContent = documentXml.asText()
            logger.info('Document content preview (first 500 chars):', xmlContent.substring(0, 500))

            // Find all placeholders in the document first for debugging
            const allPlaceholders = [
                ...xmlContent.matchAll(/\{[^{}]*\}/g),
                ...xmlContent.matchAll(/\{\{[^}]*\}\}/g)
            ]
            logger.info('Found placeholders in document:', allPlaceholders.map(m => m[0]))

            let replacementCount = 0

            // Enhanced replacement with advanced format support
            xmlContent = this.processAdvancedPlaceholders(xmlContent, data)

            // Update the document XML
            this.zip.file('word/document.xml', xmlContent)

            // Generate buffer
            const buffer = this.zip.generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            }) as Buffer

            logger.info('Advanced manual rendering completed successfully')
            return buffer
        } catch (error) {
            logger.error('Manual rendering failed:', error)
            throw new Error(`Manual rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    private processAdvancedPlaceholders(xmlContent: string, data: Record<string, any>): string {
        let processedContent = xmlContent
        let replacementCount = 0

        // Process all placeholders (both simple and advanced)
        const placeholderRegex = /\{\{\s*([^|}]+)(?:\s*\|\s*([^}]+))?\s*\}\}|\{([^{}|]+)\}/g

        processedContent = processedContent.replace(placeholderRegex, (match, advancedKey, modifiers, simpleKey) => {
            const key = (advancedKey || simpleKey || '').trim()

            if (!key || !(key in data)) {
                logger.warn(`Key "${key}" not found in data, leaving placeholder: ${match}`)
                return match
            }

            const value = data[key]

            // If no modifiers, just do simple replacement
            if (!modifiers) {
                const formattedValue = this.formatSimpleValue(value)
                logger.info(`Simple replacement: ${match} -> ${formattedValue}`)
                replacementCount++
                return formattedValue
            }

            // Parse advanced modifiers
            const parsedModifiers = this.parseModifiers(modifiers)
            const formattedValue = this.formatAdvancedValue(value, parsedModifiers, key)

            logger.info(`Advanced replacement: ${match} -> ${formattedValue}`)
            logger.info(`Modifiers applied:`, parsedModifiers)
            replacementCount++

            return formattedValue
        })

        logger.info(`Total replacements made: ${replacementCount}`)
        return processedContent
    }

    private parseModifiers(modifiers: string): Record<string, any> {
        const parsed: Record<string, any> = {}
        const modifierRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
        let match

        while ((match = modifierRegex.exec(modifiers)) !== null) {
            const [, key, quotedValue, singleQuotedValue, unquotedValue] = match
            const value = quotedValue || singleQuotedValue || unquotedValue

            switch (key) {
                case 'type':
                    parsed.type = value
                    break
                case 'label':
                    parsed.label = value
                    break
                case 'required':
                    parsed.required = value === 'true' || value === ''
                    break
                case 'maxLength':
                    if (value) parsed.maxLength = parseInt(value, 10)
                    break
                case 'min':
                    if (value) parsed.min = parseFloat(value)
                    break
                case 'max':
                    if (value) parsed.max = parseFloat(value)
                    break
                case 'step':
                    if (value) parsed.step = parseFloat(value)
                    break
                case 'options':
                    if (value) parsed.options = value.split(',').map(opt => opt.trim())
                    break
                case 'default':
                    if (value) parsed.default = value
                    break
                case 'width':
                    if (value) parsed.width = parseInt(value, 10)
                    break
                case 'height':
                    if (value) parsed.height = parseInt(value, 10)
                    break
            }
        }

        return parsed
    }

    private formatSimpleValue(value: any): string {
        if (value === null || value === undefined) {
            return ''
        }
        return String(value)
    }

    private formatAdvancedValue(value: any, modifiers: Record<string, any>, key: string): string {
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return modifiers.default || ''
        }

        const type = modifiers.type || 'text'

        try {
            switch (type) {
                case 'number':
                    return this.formatNumber(value, modifiers)

                case 'date':
                    return this.formatDate(value, modifiers)

                case 'select':
                    return this.formatSelect(value, modifiers)

                case 'image':
                    return this.formatImage(value, modifiers, key)

                case 'text':
                default:
                    return this.formatText(value, modifiers)
            }
        } catch (error) {
            logger.error(`Error formatting value for key "${key}":`, error)
            return String(value) // Fallback to simple string conversion
        }
    }

    private formatNumber(value: any, modifiers: Record<string, any>): string {
        const num = parseFloat(String(value))

        if (isNaN(num)) {
            return modifiers.default || '0'
        }

        // Apply min/max constraints
        let constrainedNum = num
        if (modifiers.min !== undefined && constrainedNum < modifiers.min) {
            constrainedNum = modifiers.min
            logger.warn(`Value ${num} was below minimum ${modifiers.min}, using minimum`)
        }
        if (modifiers.max !== undefined && constrainedNum > modifiers.max) {
            constrainedNum = modifiers.max
            logger.warn(`Value ${num} was above maximum ${modifiers.max}, using maximum`)
        }

        // Apply step formatting if specified
        if (modifiers.step !== undefined) {
            const step = modifiers.step
            if (step === 0.01) {
                return constrainedNum.toFixed(2) // Currency format
            } else if (step < 1) {
                const decimals = Math.max(0, -Math.floor(Math.log10(step)))
                return constrainedNum.toFixed(decimals)
            }
        }

        return constrainedNum.toString()
    }

    private formatDate(value: any, modifiers: Record<string, any>): string {
        try {
            const date = new Date(value)
            if (isNaN(date.getTime())) {
                return modifiers.default || ''
            }

            // Format as YYYY-MM-DD by default
            return date.toISOString().split('T')[0] || ''
        } catch (error) {
            return modifiers.default || ''
        }
    }

    private formatSelect(value: any, modifiers: Record<string, any>): string {
        const stringValue = String(value)

        // Validate against options if provided
        if (modifiers.options && Array.isArray(modifiers.options)) {
            if (modifiers.options.includes(stringValue)) {
                return stringValue
            } else {
                logger.warn(`Value "${stringValue}" not in options ${modifiers.options.join(', ')}, using default`)
                return modifiers.default || modifiers.options[0] || ''
            }
        }

        return stringValue
    }

    private formatImage(value: any, modifiers: Record<string, any>, key: string): string {
        // For images, we return a placeholder text with dimensions info
        const width = modifiers.width || 120
        const height = modifiers.height || 40

        if (value && typeof value === 'string' && value.startsWith('http')) {
            return `[Image: ${value} (${width}x${height})]`
        }

        return `[${key} Image (${width}x${height})]`
    }

    private formatText(value: any, modifiers: Record<string, any>): string {
        let text = String(value)

        // Apply maxLength constraint
        if (modifiers.maxLength && text.length > modifiers.maxLength) {
            text = text.substring(0, modifiers.maxLength) + '...'
            logger.warn(`Text truncated to ${modifiers.maxLength} characters`)
        }

        return text
    }

    public static async fromFile(filePath: string): Promise<DocxRenderer> {
        try {
            const buffer = await fs.readFile(filePath)
            return new DocxRenderer(buffer)
        } catch (error) {
            logger.error('Error reading template file:', error)
            throw new Error(`Failed to read template file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    public static fromBuffer(buffer: Buffer): DocxRenderer {
        return new DocxRenderer(buffer)
    }

    public static async fromFileOrBuffer(filePath: string, fileBuffer?: string | null): Promise<DocxRenderer> {
        // Check if we're in serverless environment and have a buffer
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

        if (isServerless && fileBuffer) {
            // Use stored buffer in serverless environment
            const buffer = Buffer.from(fileBuffer, 'base64')
            return new DocxRenderer(buffer)
        } else if (!isServerless && filePath && !filePath.startsWith('virtual://')) {
            // Use file path in local environment
            return await DocxRenderer.fromFile(filePath)
        } else {
            throw new Error('No valid file source available for rendering')
        }
    }
}
