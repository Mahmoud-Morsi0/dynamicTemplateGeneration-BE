import { DocxParser } from './docx-parser'
import fs from 'fs'
import path from 'path'

// Debug function to test parsing with actual DOCX files
export async function debugParseTemplate(templatePath?: string) {
    console.log('🔍 Debug: Testing Template Parsing')
    console.log('==================================\n')

    // Test content you provided
    const testContent = `{{ logo | type=image | width=120 | height=40 }}

Salary:{{ salary | type=number | min=0 | step=0.01 }}
Name: {{ employeeName | type=text | label="Employee Name" | required }}
Hire Date: {{ hireDate | type=date }}
Gender: {{ gender | type=select | options="Male,Female,Other" | default="Male" }}

Dependences: - {{ name | type=text }} ({{ relation | type=select | options="Spouse,Child,Other" }})`

    console.log('📝 Test Content:')
    console.log(testContent)
    console.log('\n' + '='.repeat(50) + '\n')

    // Test the parsing logic directly (without DOCX)
    console.log('🧪 Testing Parsing Logic:')
    const fields = parseContentDirectly(testContent)

    console.log(`Found ${fields.length} fields:`)
    fields.forEach((field, index) => {
        console.log(`${index + 1}. ${field.key} (${field.type})`)
        console.log(`   Full spec:`, JSON.stringify(field, null, 2))
        console.log('')
    })

    // If a template path is provided, try parsing the actual DOCX
    if (templatePath && fs.existsSync(templatePath)) {
        console.log('📄 Testing with actual DOCX file:')
        console.log(`File: ${templatePath}`)

        try {
            const buffer = fs.readFileSync(templatePath)
            const parser = new DocxParser(buffer)
            const result = parser.parse()

            console.log(`✅ Successfully parsed DOCX!`)
            console.log(`Found ${result.fields.length} fields:`)
            result.fields.forEach((field, index) => {
                console.log(`${index + 1}. ${field.key} (${field.type})`)
            })

            if (result.fields.length === 0) {
                console.log('⚠️  No fields found in DOCX. This could mean:')
                console.log('   1. The placeholders are not in the expected format')
                console.log('   2. The DOCX content extraction is not working')
                console.log('   3. The placeholders are in headers/footers/tables')
            }

        } catch (error) {
            console.log('❌ Error parsing DOCX:', error)
        }
    } else {
        console.log('💡 To test with a real DOCX file, provide the path as an argument')
        console.log('   Example: debugParseTemplate("path/to/template.docx")')
    }

    // List available templates
    const templatesDir = path.join(process.cwd(), 'storage', 'templates')
    if (fs.existsSync(templatesDir)) {
        const templates = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'))
        if (templates.length > 0) {
            console.log('\n📁 Available templates to test:')
            templates.slice(0, 5).forEach(template => {
                const fullPath = path.join(templatesDir, template)
                console.log(`   ${template}`)
            })
            if (templates.length > 5) {
                console.log(`   ... and ${templates.length - 5} more`)
            }

            console.log('\n🔧 To test with a specific template:')
            console.log(`   npx ts-node -e "import('./debug-parser').then(m => m.debugParseTemplate('storage/templates/${templates[0]}'))"`)
        }
    }
}

// Direct parsing function (without DOCX dependency)
function parseContentDirectly(content: string): any[] {
    const fields: any[] = []
    const seenKeys = new Set<string>()

    // Parse placeholders - handle both formats
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
            const parsed = parsePlaceholder(placeholder)
            if (parsed && parsed.key && !seenKeys.has(parsed.key)) {
                seenKeys.add(parsed.key)
                fields.push(parsed)
            }
        } catch (parseError) {
            console.warn('Failed to parse placeholder:', placeholder, parseError)
        }
    }

    return fields
}

// Placeholder parsing function (same as in DocxParser)
function parsePlaceholder(text: string): any {
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

    const result: any = { key, type: 'text' }

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
                result.required = value === 'true' || value === '' || value === undefined
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
        result.type = inferFieldType(key, result)
    }

    return result
}

// Type inference function
function inferFieldType(key: string, placeholder: any): string {
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

// Run debug if this file is executed directly
if (require.main === module) {
    debugParseTemplate()
}
