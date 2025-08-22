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
            logger.info('Performing manual text replacement rendering')
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

            // Replace all placeholders manually
            // Handle both {variable} and {{variable}} formats, including advanced syntax
            Object.entries(data).forEach(([key, value]) => {
                const stringValue = String(value || '')
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

                logger.info(`Processing key: "${key}" with value: "${stringValue}"`)

                // Pattern 1: Simple single brace {key}
                const singleBracePattern = new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'g')

                // Pattern 2: Simple double brace {{key}}
                const doubleBracePattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g')

                // Pattern 3: Advanced double brace with modifiers {{key | ...}}
                const advancedDoubleBracePattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\|[^}]*\\}\\}`, 'g')

                // Count matches before replacement
                const singleMatches = xmlContent.match(singleBracePattern) || []
                const doubleMatches = xmlContent.match(doubleBracePattern) || []
                const advancedMatches = xmlContent.match(advancedDoubleBracePattern) || []

                logger.info(`Key "${key}": Found ${singleMatches.length} single, ${doubleMatches.length} double, ${advancedMatches.length} advanced matches`)

                if (singleMatches.length > 0) logger.info(`Single matches for "${key}":`, singleMatches)
                if (doubleMatches.length > 0) logger.info(`Double matches for "${key}":`, doubleMatches)
                if (advancedMatches.length > 0) logger.info(`Advanced matches for "${key}":`, advancedMatches)

                // Replace all patterns
                const beforeLength = xmlContent.length
                xmlContent = xmlContent.replace(singleBracePattern, stringValue)
                xmlContent = xmlContent.replace(doubleBracePattern, stringValue)
                xmlContent = xmlContent.replace(advancedDoubleBracePattern, stringValue)
                const afterLength = xmlContent.length

                if (beforeLength !== afterLength) {
                    replacementCount++
                    logger.info(`Successfully replaced "${key}" with "${stringValue}"`)
                } else {
                    logger.warn(`No replacements made for key "${key}"`)
                }
            })

            logger.info(`Total successful replacements: ${replacementCount}`)

            // Update the document XML
            this.zip.file('word/document.xml', xmlContent)

            // Generate buffer
            const buffer = this.zip.generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            }) as Buffer

            logger.info('Manual rendering completed successfully')
            return buffer
        } catch (error) {
            logger.error('Manual rendering failed:', error)
            throw new Error(`Manual rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
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
}
