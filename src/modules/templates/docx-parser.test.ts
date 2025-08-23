import { describe, it, expect } from 'vitest'

// Test the advanced format parsing logic directly
describe('Advanced Format Parsing', () => {
    // Helper function to parse placeholders (extracted from DocxParser logic)
    function parsePlaceholder(text: string): any {
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
        key = key.replace(/\s+/g, ' ').trim()

        if (!key) return null

        const result: any = { key, type: 'text' }

        // Parse modifiers - handle both key=value and standalone key patterns
        const modifierRegex = /(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
        let modifierMatch

        while ((modifierMatch = modifierRegex.exec(modifiers)) !== null) {
            const [, modifierKey, quotedValue, singleQuotedValue, unquotedValue] = modifierMatch
            const value = quotedValue || singleQuotedValue || unquotedValue

            switch (modifierKey) {
                case 'type':
                    if (value) result.type = value
                    break
                case 'label':
                    if (value) result.label = { en: value, ar: value }
                    break
                case 'required':
                    // If 'required' is present, it's true (regardless of value)
                    result.required = true
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

        // Handle image constraints
        if (result.type === 'image' && (result.width || result.height)) {
            result.constraints = {
                ...(result.width && { width: result.width }),
                ...(result.height && { height: result.height }),
            }
            delete result.width
            delete result.height
        }

        return result
    }

    it('should parse text placeholders with label and required', () => {
        const result = parsePlaceholder('{{ name | type=text | label="Full Name" | required }}')

        expect(result).toEqual({
            key: 'name',
            type: 'text',
            label: { en: 'Full Name', ar: 'Full Name' },
            required: true,
        })
    })

    it('should parse number placeholders with constraints', () => {
        const result = parsePlaceholder('{{ salary | type=number | min=0 | step=0.01 }}')

        expect(result).toEqual({
            key: 'salary',
            type: 'number',
            min: 0,
            step: 0.01,
        })
    })

    it('should parse select placeholders with options and default', () => {
        const result = parsePlaceholder('{{ gender | type=select | options="Male,Female,Other" | default="Male" }}')

        expect(result).toEqual({
            key: 'gender',
            type: 'select',
            options: ['Male', 'Female', 'Other'],
            default: 'Male',
        })
    })

    it('should parse image placeholders with dimensions', () => {
        const result = parsePlaceholder('{{ logo | type=image | width=120 | height=40 }}')

        expect(result).toEqual({
            key: 'logo',
            type: 'image',
            constraints: {
                width: 120,
                height: 40,
            },
        })
    })

    it('should parse simple placeholders without modifiers', () => {
        const result = parsePlaceholder('{{ employeeName }}')

        expect(result).toEqual({
            key: 'employeeName',
            type: 'text',
        })
    })

    it('should parse single brace placeholders', () => {
        const result = parsePlaceholder('{ company }')

        expect(result).toEqual({
            key: 'company',
            type: 'text',
        })
    })

    it('should handle text with maxLength', () => {
        const result = parsePlaceholder('{{ description | type=text | maxLength=500 }}')

        expect(result).toEqual({
            key: 'description',
            type: 'text',
            maxLength: 500,
        })
    })

    it('should handle number with min and max', () => {
        const result = parsePlaceholder('{{ age | type=number | min=18 | max=65 }}')

        expect(result).toEqual({
            key: 'age',
            type: 'number',
            min: 18,
            max: 65,
        })
    })

    it('should return null for invalid placeholders', () => {
        expect(parsePlaceholder('invalid')).toBeNull()
        expect(parsePlaceholder('{{ }}')).toBeNull()
        expect(parsePlaceholder('{ }')).toBeNull()
    })

    it('should handle quoted values correctly', () => {
        const result = parsePlaceholder('{{ field | label="Test Label" | default="Default Value" }}')

        expect(result).toEqual({
            key: 'field',
            type: 'text',
            label: { en: 'Test Label', ar: 'Test Label' },
            default: 'Default Value',
        })
    })
})

// Test the enhanced rendering logic
describe('Enhanced Rendering Logic', () => {
    // Helper function to format values (extracted from DocxRenderer logic)
    function formatValue(value: any, modifiers: Record<string, any>): string {
        if (value === null || value === undefined) {
            return modifiers.default || ''
        }

        const type = modifiers.type || 'text'

        switch (type) {
            case 'number':
                return formatNumber(value, modifiers)
            case 'date':
                return formatDate(value, modifiers)
            case 'select':
                return formatSelect(value, modifiers)
            case 'image':
                return formatImage(value, modifiers)
            case 'text':
            default:
                return formatText(value, modifiers)
        }
    }

    function formatNumber(value: any, modifiers: Record<string, any>): string {
        const num = parseFloat(String(value))

        if (isNaN(num)) {
            return modifiers.default || '0'
        }

        // Apply min/max constraints
        let constrainedNum = num
        if (modifiers.min !== undefined && constrainedNum < modifiers.min) {
            constrainedNum = modifiers.min
        }
        if (modifiers.max !== undefined && constrainedNum > modifiers.max) {
            constrainedNum = modifiers.max
        }

        // Apply step formatting
        if (modifiers.step !== undefined) {
            const step = modifiers.step
            if (step === 0.01) {
                return constrainedNum.toFixed(2)
            } else if (step < 1) {
                const decimals = Math.max(0, -Math.floor(Math.log10(step)))
                return constrainedNum.toFixed(decimals)
            }
        }

        return constrainedNum.toString()
    }

    function formatDate(value: any, modifiers: Record<string, any>): string {
        try {
            const date = new Date(value)
            if (isNaN(date.getTime())) {
                return modifiers.default || ''
            }
            return date.toISOString().split('T')[0] || ''
        } catch (error) {
            return modifiers.default || ''
        }
    }

    function formatSelect(value: any, modifiers: Record<string, any>): string {
        const stringValue = String(value)

        if (modifiers.options && Array.isArray(modifiers.options)) {
            if (modifiers.options.includes(stringValue)) {
                return stringValue
            } else {
                return modifiers.default || modifiers.options[0] || ''
            }
        }

        return stringValue
    }

    function formatImage(value: any, modifiers: Record<string, any>): string {
        const width = modifiers.width || 120
        const height = modifiers.height || 40

        if (value && typeof value === 'string' && value.startsWith('http')) {
            return `[Image: ${value} (${width}x${height})]`
        }

        return `[Image (${width}x${height})]`
    }

    function formatText(value: any, modifiers: Record<string, any>): string {
        let text = String(value)

        if (modifiers.maxLength && text.length > modifiers.maxLength) {
            text = text.substring(0, modifiers.maxLength) + '...'
        }

        return text
    }

    it('should format numbers with step precision', () => {
        const result = formatValue(75000.5, { type: 'number', step: 0.01 })
        expect(result).toBe('75000.50')
    })

    it('should apply min constraints to numbers', () => {
        const result = formatValue(-1000, { type: 'number', min: 0, step: 0.01 })
        expect(result).toBe('0.00')
    })

    it('should format dates to ISO format', () => {
        const result = formatValue('2023-06-15', { type: 'date' })
        expect(result).toBe('2023-06-15')
    })

    it('should validate select options', () => {
        const modifiers = { type: 'select', options: ['Male', 'Female', 'Other'], default: 'Male' }

        expect(formatValue('Female', modifiers)).toBe('Female')
        expect(formatValue('Unknown', modifiers)).toBe('Male') // fallback to default
    })

    it('should format image placeholders with dimensions', () => {
        const result = formatValue('https://example.com/logo.png', {
            type: 'image',
            width: 120,
            height: 40
        })
        expect(result).toBe('[Image: https://example.com/logo.png (120x40)]')
    })

    it('should truncate text with maxLength', () => {
        const longText = 'This is a very long text that should be truncated'
        const result = formatValue(longText, { type: 'text', maxLength: 20 })
        expect(result).toBe('This is a very long ...')
    })
})